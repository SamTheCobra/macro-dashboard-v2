import datetime
import logging
import time

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db, SessionLocal
from ..models import Thesis
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

    # Update thesis with new evidence score
    thesis.evidence_score = result["final_score"]
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
    }


def _refresh_all_evidence_background():
    """Background task: refresh evidence for all active theses."""
    from ..services.trends_service import get_evidence_score as get_trends_score

    db = SessionLocal()
    try:
        theses = db.query(Thesis).filter(Thesis.status == "active").all()
        logger.info(f"[evidence] Starting bulk refresh for {len(theses)} theses")

        for thesis in theses:
            keywords = thesis.keywords or []
            if not keywords:
                logger.info(f"[evidence] Skipping '{thesis.title}' — no keywords")
                continue

            # Skip if refreshed within 24 hours
            if thesis.last_evidence_refresh:
                hours_ago = (datetime.datetime.utcnow() - thesis.last_evidence_refresh).total_seconds() / 3600
                if hours_ago < 24:
                    logger.info(f"[evidence] Skipping '{thesis.title}' — refreshed {hours_ago:.1f}h ago")
                    continue

            try:
                result = get_trends_score(keywords)
                if result:
                    thesis.evidence_score = result["final_score"]
                    thesis.last_evidence_refresh = datetime.datetime.utcnow()
                    db.commit()
                    logger.info(f"[evidence] Refreshed: {thesis.title} -> score: {result['final_score']}")
                else:
                    logger.warning(f"[evidence] No data for: {thesis.title}")
            except Exception as e:
                logger.error(f"[evidence] Failed for '{thesis.title}': {e}")
                db.rollback()

            # Rate limit: 3 seconds between theses
            time.sleep(3)

        logger.info("[evidence] Bulk refresh complete")
    except Exception as e:
        logger.error(f"[evidence] Bulk refresh error: {e}")
        db.rollback()
    finally:
        db.close()


@router.post("/api/evidence/refresh-all")
def refresh_all_evidence(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Kick off a background evidence refresh for all active theses."""
    thesis_count = db.query(Thesis).filter(Thesis.status == "active").count()
    background_tasks.add_task(_refresh_all_evidence_background)
    return {"started": True, "thesis_count": thesis_count}
