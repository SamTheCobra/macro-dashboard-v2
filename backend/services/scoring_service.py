import datetime
from sqlalchemy.orm import Session
from ..models import Thesis, ConvictionEntry, NodeTicker, TreeNode
from .news_service import get_news_pulse


def get_conviction_score(db: Session, thesis_id: int) -> float:
    """Get weighted conviction score (0-10) across all tree nodes.
    Root conviction: 40%, 2nd-order avg: 35%, 3rd-order avg: 25%."""
    # Root conviction from ConvictionEntry
    latest = db.query(ConvictionEntry).filter(
        ConvictionEntry.thesis_id == thesis_id
    ).order_by(ConvictionEntry.date.desc()).first()
    root_conv = float(latest.score) if latest else 5.0

    # Get child node convictions
    nodes = db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).all()
    so_scores = [float(n.user_conviction) for n in nodes if n.node_type == "second_order" and n.user_conviction is not None]
    to_scores = [float(n.user_conviction) for n in nodes if n.node_type == "third_order" and n.user_conviction is not None]

    # If no child convictions set, fall back to root only
    if not so_scores and not to_scores:
        return root_conv

    so_avg = sum(so_scores) / len(so_scores) if so_scores else root_conv
    to_avg = sum(to_scores) / len(to_scores) if to_scores else so_avg

    # Weighted average: root 40%, 2nd-order 35%, 3rd-order 25%
    weighted = root_conv * 0.4 + so_avg * 0.35 + to_avg * 0.25
    return round(min(max(weighted, 0), 10), 1)


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
