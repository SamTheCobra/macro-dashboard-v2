from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis
from ..schemas import HealthScoreDetail
from ..services.scoring_service import get_all_scores

router = APIRouter(prefix="/api/theses/{thesis_id}/evidence", tags=["evidence"])


@router.get("", response_model=HealthScoreDetail)
def get_evidence(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    scores = get_all_scores(db, thesis)
    return HealthScoreDetail(**scores)
