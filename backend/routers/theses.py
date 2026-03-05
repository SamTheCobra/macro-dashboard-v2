from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis, TreeNode, NodeTicker
from ..schemas import ThesisCreate, ThesisUpdate, ThesisOut
from ..services.scoring_service import get_all_scores_fast
from ..services.ai_service import generate_thesis_tree, store_thesis_tree

router = APIRouter(prefix="/api/theses", tags=["theses"])


@router.get("", response_model=list[ThesisOut])
def list_theses(status: str = "active", db: Session = Depends(get_db)):
    theses = db.query(Thesis).filter(Thesis.status == status).all()
    results = []
    for t in theses:
        scores = get_all_scores_fast(db, t)
        node_count = db.query(TreeNode).filter(TreeNode.thesis_id == t.id).count()

        # Get top tickers
        tickers = db.query(NodeTicker.symbol).join(TreeNode).filter(
            TreeNode.thesis_id == t.id
        ).distinct().limit(3).all()
        top_tickers = [tk[0] for tk in tickers]

        results.append(ThesisOut(
            id=t.id,
            title=t.title,
            description=t.description,
            status=t.status,
            activation_date=t.activation_date,
            keywords=t.keywords or [],
            created_at=t.created_at,
            updated_at=t.updated_at,
            conviction_score=scores["conviction_score"],
            evidence_score=scores["evidence_score"],
            health_score=scores["health_score"],
            news_pulse=scores["news_pulse_score"],
            node_count=node_count,
            top_tickers=top_tickers,
            last_evidence_refresh=t.last_evidence_refresh,
        ))

    results.sort(key=lambda x: x.health_score or 0, reverse=True)
    return results


@router.post("", response_model=ThesisOut)
def create_thesis(data: ThesisCreate, db: Session = Depends(get_db)):
    thesis = Thesis(title=data.title)
    db.add(thesis)
    db.commit()
    db.refresh(thesis)

    try:
        tree_data = generate_thesis_tree(data.title)
        store_thesis_tree(db, thesis, tree_data)
        db.refresh(thesis)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    scores = get_all_scores_fast(db, thesis)
    node_count = db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).count()
    tickers = db.query(NodeTicker.symbol).join(TreeNode).filter(
        TreeNode.thesis_id == thesis.id
    ).distinct().limit(3).all()

    return ThesisOut(
        id=thesis.id,
        title=thesis.title,
        description=thesis.description,
        status=thesis.status,
        activation_date=thesis.activation_date,
        keywords=thesis.keywords or [],
        created_at=thesis.created_at,
        updated_at=thesis.updated_at,
        conviction_score=scores["conviction_score"],
        evidence_score=scores["evidence_score"],
        health_score=scores["health_score"],
        news_pulse=scores["news_pulse_score"],
        node_count=node_count,
        top_tickers=[tk[0] for tk in tickers],
        last_evidence_refresh=thesis.last_evidence_refresh,
    )


@router.get("/{thesis_id}", response_model=ThesisOut)
def get_thesis(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    scores = get_all_scores_fast(db, thesis)
    node_count = db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).count()
    tickers = db.query(NodeTicker.symbol).join(TreeNode).filter(
        TreeNode.thesis_id == thesis.id
    ).distinct().limit(3).all()

    return ThesisOut(
        id=thesis.id,
        title=thesis.title,
        description=thesis.description,
        status=thesis.status,
        activation_date=thesis.activation_date,
        keywords=thesis.keywords or [],
        created_at=thesis.created_at,
        updated_at=thesis.updated_at,
        conviction_score=scores["conviction_score"],
        evidence_score=scores["evidence_score"],
        health_score=scores["health_score"],
        news_pulse=scores["news_pulse_score"],
        node_count=node_count,
        top_tickers=[tk[0] for tk in tickers],
        last_evidence_refresh=thesis.last_evidence_refresh,
    )


@router.put("/{thesis_id}", response_model=ThesisOut)
def update_thesis(thesis_id: int, data: ThesisUpdate, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    if data.title is not None:
        thesis.title = data.title
        # Also update root TreeNode label to match
        root_node = db.query(TreeNode).filter(
            TreeNode.thesis_id == thesis.id,
            TreeNode.parent_id.is_(None),
        ).first()
        if root_node:
            root_node.label = data.title
    if data.status is not None:
        thesis.status = data.status
    if data.keywords is not None:
        thesis.keywords = data.keywords

    db.commit()
    db.refresh(thesis)

    scores = get_all_scores_fast(db, thesis)
    node_count = db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).count()
    tickers = db.query(NodeTicker.symbol).join(TreeNode).filter(
        TreeNode.thesis_id == thesis.id
    ).distinct().limit(3).all()

    return ThesisOut(
        id=thesis.id,
        title=thesis.title,
        description=thesis.description,
        status=thesis.status,
        activation_date=thesis.activation_date,
        keywords=thesis.keywords or [],
        created_at=thesis.created_at,
        updated_at=thesis.updated_at,
        conviction_score=scores["conviction_score"],
        evidence_score=scores["evidence_score"],
        health_score=scores["health_score"],
        news_pulse=scores["news_pulse_score"],
        node_count=node_count,
        top_tickers=[tk[0] for tk in tickers],
        last_evidence_refresh=thesis.last_evidence_refresh,
    )


@router.delete("/{thesis_id}")
def delete_thesis(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")
    db.delete(thesis)
    db.commit()
    return {"ok": True}
