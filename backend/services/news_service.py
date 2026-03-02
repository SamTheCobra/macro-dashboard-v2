import os
import datetime
import requests
from sqlalchemy.orm import Session
from ..models import Thesis, NewsArticle, NewsFetchLog
from .ai_service import classify_headline

NEWS_API_BASE = "https://newsapi.org/v2/everything"
FETCH_COOLDOWN_HOURS = 6


def fetch_news_for_thesis(db: Session, thesis: Thesis) -> list[dict]:
    """Fetch and classify news headlines for a thesis using NewsAPI."""
    api_key = os.getenv("NEWS_API_KEY")
    if not api_key:
        return []

    # Check cooldown
    last_fetch = db.query(NewsFetchLog).filter(
        NewsFetchLog.thesis_id == thesis.id
    ).order_by(NewsFetchLog.fetched_at.desc()).first()

    if last_fetch and last_fetch.fetched_at:
        age = datetime.datetime.utcnow() - last_fetch.fetched_at
        if age.total_seconds() < FETCH_COOLDOWN_HOURS * 3600:
            return []

    keywords = thesis.keywords or []
    if not keywords:
        return []

    query = " OR ".join(keywords[:5])

    try:
        resp = requests.get(NEWS_API_BASE, params={
            "q": query,
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": 20,
            "apiKey": api_key,
        }, timeout=10)
        resp.raise_for_status()
        articles = resp.json().get("articles", [])
    except Exception:
        return []

    results = []
    for article in articles[:20]:
        title = article.get("title", "")
        if not title or title == "[Removed]":
            continue

        # Check if already stored
        existing = db.query(NewsArticle).filter(
            NewsArticle.thesis_id == thesis.id,
            NewsArticle.title == title,
        ).first()
        if existing:
            continue

        # Classify with AI
        try:
            classification = classify_headline(title, thesis.title)
        except Exception:
            classification = {"classification": "neutral", "summary": "Classification unavailable"}

        news = NewsArticle(
            thesis_id=thesis.id,
            title=title,
            url=article.get("url"),
            source=article.get("source", {}).get("name"),
            published_at=article.get("publishedAt"),
            classification=classification.get("classification", "neutral"),
            summary=classification.get("summary", ""),
        )
        db.add(news)
        results.append({
            "title": title,
            "classification": news.classification,
            "summary": news.summary,
        })

    # Log fetch
    db.add(NewsFetchLog(thesis_id=thesis.id))
    db.commit()
    return results


def get_news_pulse(db: Session, thesis_id: int) -> float:
    """Calculate news pulse score: ratio of confirming to total classified articles over 30 days."""
    cutoff = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    articles = db.query(NewsArticle).filter(
        NewsArticle.thesis_id == thesis_id,
        NewsArticle.fetched_at >= cutoff,
    ).all()

    if not articles:
        return 5.0  # neutral default

    confirming = sum(1 for a in articles if a.classification == "confirming")
    contradicting = sum(1 for a in articles if a.classification == "contradicting")
    total_classified = confirming + contradicting

    if total_classified == 0:
        return 5.0

    ratio = confirming / total_classified
    return round(ratio * 10, 1)  # 0-10 scale
