from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis, NewsArticle
from ..schemas import NewsArticleOut
from ..services.news_service import fetch_news_for_thesis, get_news_pulse

router = APIRouter(prefix="/api/theses/{thesis_id}/news", tags=["news"])


@router.get("", response_model=list[NewsArticleOut])
def list_news(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    articles = db.query(NewsArticle).filter(
        NewsArticle.thesis_id == thesis_id
    ).order_by(NewsArticle.published_at.desc()).limit(20).all()

    return articles


@router.post("/fetch")
def fetch_news(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    new_articles = fetch_news_for_thesis(db, thesis)
    return {"fetched": len(new_articles), "articles": new_articles}


@router.get("/pulse")
def news_pulse(thesis_id: int, db: Session = Depends(get_db)):
    pulse = get_news_pulse(db, thesis_id)
    return {"pulse_score": pulse}
