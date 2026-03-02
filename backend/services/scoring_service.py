import datetime
from sqlalchemy.orm import Session
from ..models import Thesis, ConvictionEntry, NodeTicker
from .market_service import calculate_ticker_performance
from .news_service import get_news_pulse


def get_conviction_score(db: Session, thesis_id: int) -> float:
    """Get the latest conviction score (0-10) for a thesis."""
    latest = db.query(ConvictionEntry).filter(
        ConvictionEntry.thesis_id == thesis_id
    ).order_by(ConvictionEntry.date.desc()).first()

    return float(latest.score) if latest else 5.0


def get_evidence_score(db: Session, thesis: Thesis) -> float:
    """Calculate evidence score (0-10) from ticker performance and news pulse.
    70% ticker performance, 30% news pulse."""

    ticker_score = _calculate_ticker_evidence(db, thesis)
    news_pulse = get_news_pulse(db, thesis.id)

    return round(ticker_score * 0.7 + news_pulse * 0.3, 1)


def _calculate_ticker_evidence(db: Session, thesis: Thesis) -> float:
    """Calculate ticker performance evidence score (0-10)."""
    tickers = db.query(NodeTicker).join(
        NodeTicker.node
    ).filter(
        NodeTicker.node.has(thesis_id=thesis.id)
    ).all()

    if not tickers:
        return 5.0  # neutral default

    if not thesis.activation_date:
        return 5.0

    activation_date = thesis.activation_date.date() if hasattr(thesis.activation_date, 'date') else thesis.activation_date

    scores = []
    for ticker in tickers:
        perf = calculate_ticker_performance(db, ticker.symbol, activation_date)
        if perf is None:
            continue

        if ticker.direction == "long":
            # Positive performance = positive evidence
            score = 5.0 + min(max(perf / 10, -5), 5)
        else:
            # For short direction, negative performance = positive evidence
            score = 5.0 + min(max(-perf / 10, -5), 5)

        scores.append(score)

    if not scores:
        return 5.0

    return round(sum(scores) / len(scores), 1)


def get_health_score(db: Session, thesis: Thesis) -> float:
    """Calculate health score (0-100).
    Formula: (conviction_score * 0.4 + evidence_score * 0.6) * 10"""
    conviction = get_conviction_score(db, thesis.id)
    evidence = get_evidence_score(db, thesis)
    health = (conviction * 0.4 + evidence * 0.6) * 10
    return round(min(max(health, 0), 100), 1)


def get_all_scores(db: Session, thesis: Thesis) -> dict:
    """Get all scores for a thesis."""
    conviction = get_conviction_score(db, thesis.id)
    evidence = get_evidence_score(db, thesis)
    health = (conviction * 0.4 + evidence * 0.6) * 10
    health = round(min(max(health, 0), 100), 1)
    news_pulse = get_news_pulse(db, thesis.id)
    ticker_perf = _calculate_ticker_evidence(db, thesis)

    return {
        "conviction_score": conviction,
        "evidence_score": evidence,
        "health_score": health,
        "news_pulse_score": news_pulse,
        "ticker_performance_score": ticker_perf,
    }
