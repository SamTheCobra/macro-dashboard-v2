import datetime
from sqlalchemy.orm import Session
from ..models import Thesis, ConvictionEntry, NodeTicker
from .news_service import get_news_pulse


def get_conviction_score(db: Session, thesis_id: int) -> float:
    """Get the latest conviction score (0-10) for a thesis."""
    latest = db.query(ConvictionEntry).filter(
        ConvictionEntry.thesis_id == thesis_id
    ).order_by(ConvictionEntry.date.desc()).first()

    return float(latest.score) if latest else 5.0


def get_evidence_score(db: Session, thesis: Thesis) -> float:
    """Get the evidence score for a thesis.
    Uses stored score if evidence has been refreshed, otherwise returns neutral default."""
    if thesis.last_evidence_refresh is not None:
        return float(thesis.evidence_score) if thesis.evidence_score is not None else 5.0

    return 5.0


def get_health_score(db: Session, thesis: Thesis) -> float:
    """Calculate health score (0-100).
    If evidence has been refreshed (not default): health = (conviction * 0.4 + evidence * 0.6) * 10
    If evidence is still default: health = conviction * 10 (pure conviction)"""
    conviction = get_conviction_score(db, thesis.id)
    evidence = get_evidence_score(db, thesis)

    if thesis.last_evidence_refresh is not None:
        health = (conviction * 0.4 + evidence * 0.6) * 10
    else:
        health = conviction * 10

    return round(min(max(health, 0), 100), 1)


def get_all_scores(db: Session, thesis: Thesis) -> dict:
    """Get all scores for a thesis. Uses only cached/stored values, never calls yfinance."""
    conviction = get_conviction_score(db, thesis.id)
    evidence = get_evidence_score(db, thesis)

    if thesis.last_evidence_refresh is not None:
        health = (conviction * 0.4 + evidence * 0.6) * 10
    else:
        health = conviction * 10

    health = round(min(max(health, 0), 100), 1)
    news_pulse = get_news_pulse(db, thesis.id)

    return {
        "conviction_score": conviction,
        "evidence_score": evidence,
        "health_score": health,
        "news_pulse_score": news_pulse,
        "ticker_performance_score": 5.0,
    }


def get_all_scores_fast(db: Session, thesis: Thesis) -> dict:
    """Get scores without blocking. Uses only cached/stored values, never calls yfinance."""
    from .score_cache import get_cached_scores

    conviction = get_conviction_score(db, thesis.id)
    evidence = get_evidence_score(db, thesis)

    if thesis.last_evidence_refresh is not None:
        health = (conviction * 0.4 + evidence * 0.6) * 10
    else:
        health = conviction * 10

    health = round(min(max(health, 0), 100), 1)

    cached = get_cached_scores(thesis.id)
    news_pulse = get_news_pulse(db, thesis.id)
    ticker_perf = cached["ticker_performance_score"] if cached else 5.0

    return {
        "conviction_score": conviction,
        "evidence_score": evidence,
        "health_score": health,
        "news_pulse_score": news_pulse,
        "ticker_performance_score": ticker_perf,
    }
