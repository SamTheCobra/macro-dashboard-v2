import os
import datetime
import requests
from sqlalchemy.orm import Session
from ..models import MarketDataCache

FRED_API_BASE = "https://api.stlouisfed.org/fred/series/observations"
CACHE_TTL_HOURS = 6

REGIME_SERIES = {
    "FEDFUNDS": "Fed Funds Rate",
    "GS10": "10Y Treasury Yield",
    "GS2": "2Y Treasury Yield",
    "T10Y2Y": "10Y-2Y Spread",
    "VIXCLS": "VIX (CBOE)",
}


def _get_cached(db: Session, identifier: str) -> dict | None:
    cache = db.query(MarketDataCache).filter(
        MarketDataCache.source == "fred",
        MarketDataCache.identifier == identifier,
    ).first()

    if cache and cache.last_updated:
        age = datetime.datetime.utcnow() - cache.last_updated
        if age.total_seconds() < CACHE_TTL_HOURS * 3600:
            return cache.data_json
    return None


def _store_cache(db: Session, identifier: str, data: dict) -> None:
    cache = db.query(MarketDataCache).filter(
        MarketDataCache.source == "fred",
        MarketDataCache.identifier == identifier,
    ).first()

    if cache:
        cache.data_json = data
        cache.last_updated = datetime.datetime.utcnow()
    else:
        cache = MarketDataCache(
            source="fred",
            identifier=identifier,
            data_json=data,
            last_updated=datetime.datetime.utcnow(),
        )
        db.add(cache)
    db.commit()


def fetch_fred_series(db: Session, series_id: str) -> float | None:
    """Fetch latest value for a FRED series."""
    cached = _get_cached(db, series_id)
    if cached:
        return cached.get("value")

    api_key = os.getenv("FRED_API_KEY")
    if not api_key:
        return None

    try:
        resp = requests.get(FRED_API_BASE, params={
            "series_id": series_id,
            "api_key": api_key,
            "sort_order": "desc",
            "limit": 5,
            "file_type": "json",
        }, timeout=10)
        resp.raise_for_status()
        observations = resp.json().get("observations", [])

        for obs in observations:
            val = obs.get("value", ".")
            if val != ".":
                value = float(val)
                _store_cache(db, series_id, {"value": value})
                return value
    except Exception:
        pass
    return None


def get_macro_regime(db: Session) -> dict:
    """Determine current macro regime from FRED data."""
    fed_funds = fetch_fred_series(db, "FEDFUNDS")
    gs10 = fetch_fred_series(db, "GS10")
    gs2 = fetch_fred_series(db, "GS2")
    spread = fetch_fred_series(db, "T10Y2Y")
    vix = fetch_fred_series(db, "VIXCLS")

    # Calculate spread if not available directly
    if spread is None and gs10 is not None and gs2 is not None:
        spread = gs10 - gs2

    regime = "Neutral"
    confidence = "low"

    if vix is not None and vix > 30:
        regime = "Risk-Off"
        confidence = "high"
    elif vix is not None and vix > 25:
        regime = "Risk-Off"
        confidence = "medium"
    elif fed_funds is not None and fed_funds > 5.0:
        regime = "Tightening"
        confidence = "high" if (vix and vix > 20) else "medium"
    elif fed_funds is not None and fed_funds < 2.0:
        regime = "Easing"
        confidence = "high"
    elif spread is not None and spread < -0.2:
        regime = "Tightening"
        confidence = "medium"
    elif spread is not None and spread > 1.0:
        if vix and vix < 18:
            regime = "Risk-On"
            confidence = "medium"
        else:
            regime = "Reflation"
            confidence = "medium"
    elif vix is not None and vix < 15:
        regime = "Risk-On"
        confidence = "medium"
    else:
        regime = "Neutral"
        confidence = "low"

    return {
        "regime": regime,
        "confidence": confidence,
        "fed_funds_rate": fed_funds,
        "yield_spread": spread,
        "vix": vix,
    }
