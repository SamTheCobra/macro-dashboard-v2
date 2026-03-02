import time
import datetime
import yfinance as yf
from sqlalchemy.orm import Session
from ..models import MarketDataCache

CACHE_TTL_HOURS = 6
REQUEST_DELAY = 1.0  # seconds between yfinance requests


def _get_cached(db: Session, source: str, identifier: str) -> dict | None:
    """Return cached data if fresh enough, else None."""
    cache = db.query(MarketDataCache).filter(
        MarketDataCache.source == source,
        MarketDataCache.identifier == identifier,
    ).first()

    if cache and cache.last_updated:
        age = datetime.datetime.utcnow() - cache.last_updated
        if age.total_seconds() < CACHE_TTL_HOURS * 3600:
            return cache.data_json
    return None


def _store_cache(db: Session, source: str, identifier: str, data: dict) -> None:
    """Update or create cache entry."""
    cache = db.query(MarketDataCache).filter(
        MarketDataCache.source == source,
        MarketDataCache.identifier == identifier,
    ).first()

    if cache:
        cache.data_json = data
        cache.last_updated = datetime.datetime.utcnow()
    else:
        cache = MarketDataCache(
            source=source,
            identifier=identifier,
            data_json=data,
            last_updated=datetime.datetime.utcnow(),
        )
        db.add(cache)
    db.commit()


def fetch_ticker_price(db: Session, symbol: str) -> float | None:
    """Fetch current price for a ticker with caching and rate limiting."""
    cached = _get_cached(db, "yfinance", f"{symbol}_price")
    if cached:
        return cached.get("price")

    time.sleep(REQUEST_DELAY)
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        price = info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose")
        if price:
            _store_cache(db, "yfinance", f"{symbol}_price", {"price": price})
        return price
    except Exception:
        return None


def fetch_ticker_history(db: Session, symbol: str, period: str = "6mo") -> dict | None:
    """Fetch price history for a ticker. Returns {date_str: close_price}."""
    cache_key = f"{symbol}_history_{period}"
    cached = _get_cached(db, "yfinance", cache_key)
    if cached:
        return cached

    time.sleep(REQUEST_DELAY)
    try:
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        if hist.empty:
            return None

        data = {}
        for date, row in hist.iterrows():
            data[date.strftime("%Y-%m-%d")] = round(row["Close"], 2)

        _store_cache(db, "yfinance", cache_key, data)
        return data
    except Exception:
        return None


def fetch_price_at_date(db: Session, symbol: str, target_date: datetime.date) -> float | None:
    """Get ticker price closest to a specific date."""
    history = fetch_ticker_history(db, symbol, period="2y")
    if not history:
        return None

    target_str = target_date.strftime("%Y-%m-%d")
    if target_str in history:
        return history[target_str]

    # Find closest date before target
    dates = sorted(history.keys())
    closest = None
    for d in dates:
        if d <= target_str:
            closest = d
    return history[closest] if closest else None


def calculate_ticker_performance(db: Session, symbol: str, since_date: datetime.date) -> float | None:
    """Calculate % performance of a ticker since a date. Positive = up, negative = down."""
    current = fetch_ticker_price(db, symbol)
    base_price = fetch_price_at_date(db, symbol, since_date)

    if current is None or base_price is None or base_price == 0:
        return None

    return ((current - base_price) / base_price) * 100
