import datetime
import logging
import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..models import Thesis, NewsArticle
from ..schemas import HealthScoreDetail
from ..services.scoring_service import get_all_scores_fast, get_conviction_score

logger = logging.getLogger(__name__)

router = APIRouter(tags=["evidence"])


@router.get("/api/theses/{thesis_id}/evidence", response_model=HealthScoreDetail)
def get_evidence(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    scores = get_all_scores_fast(db, thesis)
    scores["evidence_breakdown"] = thesis.evidence_breakdown
    return HealthScoreDetail(**scores)


@router.post("/api/theses/{thesis_id}/refresh-evidence")
def refresh_evidence(thesis_id: int, db: Session = Depends(get_db)):
    """Refresh evidence score for a thesis using Google Trends data."""
    from ..services.trends_service import get_evidence_score as get_trends_score

    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    keywords = thesis.keywords or []
    if not keywords:
        raise HTTPException(status_code=400, detail="Thesis has no keywords for trends lookup")

    result = get_trends_score(keywords)
    if result is None:
        raise HTTPException(status_code=502, detail="Google Trends request failed. Try again later.")

    # Get recent news headlines for the breakdown
    recent_news = db.query(NewsArticle).filter(
        NewsArticle.thesis_id == thesis.id,
    ).order_by(NewsArticle.published_at.desc()).limit(3).all()
    recent_headlines = [
        {"title": n.title, "classification": n.classification, "source": n.source}
        for n in recent_news
    ]

    # Build and store evidence breakdown
    breakdown = {
        "keywords_queried": result["trend_data"]["keywords_queried"],
        "trend_momentum": result["trend_data"]["trend_momentum"],
        "keyword_breadth": result["trend_data"]["keyword_breadth"],
        "recency_bonus": result["trend_data"]["recency_bonus"],
        "recent_headlines": recent_headlines,
    }

    # Update thesis with new evidence score and breakdown
    thesis.evidence_score = result["final_score"]
    thesis.evidence_breakdown = breakdown
    thesis.last_evidence_refresh = datetime.datetime.utcnow()
    db.commit()
    db.refresh(thesis)

    # Recalculate health score
    conviction = get_conviction_score(db, thesis.id)
    health = (conviction * 0.4 + result["final_score"] * 0.6) * 10
    health = round(min(max(health, 0), 100), 1)

    return {
        "evidence_score": result["final_score"],
        "trend_data": result["trend_data"],
        "health_score": health,
        "evidence_breakdown": breakdown,
    }


def _refresh_all_evidence_background():
    """Background task: refresh evidence for all active theses."""
    from ..services.trends_service import get_evidence_score as get_trends_score

    db = SessionLocal()
    try:
        theses = db.query(Thesis).filter(Thesis.status == "active").all()
        print(f"[evidence-refresh] Starting bulk refresh for {len(theses)} active theses")

        refreshed = 0
        failed = 0
        for thesis in theses:
            keywords = thesis.keywords or []
            if not keywords:
                print(f"[evidence-refresh] Skipping thesis_id={thesis.id} '{thesis.title}' — no keywords")
                continue

            # Skip if refreshed within 24 hours
            if thesis.last_evidence_refresh:
                hours_ago = (datetime.datetime.utcnow() - thesis.last_evidence_refresh).total_seconds() / 3600
                if hours_ago < 24:
                    print(f"[evidence-refresh] Skipping thesis_id={thesis.id} — refreshed {hours_ago:.1f}h ago")
                    continue

            try:
                result = get_trends_score(keywords)
                if result:
                    thesis.evidence_score = result["final_score"]
                    thesis.last_evidence_refresh = datetime.datetime.utcnow()
                    db.commit()
                    refreshed += 1
                    print(f"[evidence-refresh] thesis_id={thesis.id} done, score={result['final_score']}")
                else:
                    failed += 1
                    print(f"[evidence-refresh] Failed: thesis_id={thesis.id} reason=no data returned")
            except Exception as e:
                failed += 1
                print(f"[evidence-refresh] Failed: thesis_id={thesis.id} reason={e}")
                db.rollback()

            # Rate limit: 10 seconds between theses to avoid Google 429s
            time.sleep(10)

        print(f"[evidence-refresh] Complete. refreshed={refreshed} failed={failed}")
    except Exception as e:
        print(f"[evidence-refresh] Bulk refresh error: {e}")
        db.rollback()
    finally:
        db.close()


@router.post("/api/evidence/refresh-all")
def refresh_all_evidence(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Kick off a background evidence refresh for all active theses."""
    thesis_count = db.query(Thesis).filter(Thesis.status == "active").count()
    background_tasks.add_task(_refresh_all_evidence_background)
    return {"started": True, "thesis_count": thesis_count}
