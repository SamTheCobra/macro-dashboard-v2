import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis, TreeNode, NodeTicker, StartupIdea
from ..services.ai_service import generate_thesis_tree, store_thesis_tree

logger = logging.getLogger(__name__)

from pydantic import BaseModel

router = APIRouter(prefix="/api/theses/{thesis_id}/tree", tags=["tree"])

# Standalone router for tree node endpoints (no thesis_id prefix)
node_router = APIRouter(tags=["tree"])


class NodeConvictionUpdate(BaseModel):
    score: int


@node_router.put("/api/tree-nodes/{node_id}/conviction")
def update_node_conviction(node_id: int, data: NodeConvictionUpdate, db: Session = Depends(get_db)):
    node = db.query(TreeNode).filter(TreeNode.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail="Tree node not found")
    node.user_conviction = max(1, min(10, data.score))
    db.commit()
    return {"ok": True, "user_conviction": node.user_conviction}


@router.get("")
def get_tree(thesis_id: int, db: Session = Depends(get_db)):
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    nodes = db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).all()

    def build_node(node):
        tickers = db.query(NodeTicker).filter(NodeTicker.node_id == node.id).all()
        ideas = db.query(StartupIdea).filter(StartupIdea.node_id == node.id).all()
        children = [n for n in nodes if n.parent_id == node.id]

        return {
            "id": node.id,
            "parent_id": node.parent_id,
            "node_type": node.node_type,
            "label": node.label,
            "description": node.description,
            "sort_order": node.sort_order,
            "user_conviction": node.user_conviction,
            "tickers": [
                {"id": t.id, "symbol": t.symbol, "rationale": t.rationale, "direction": t.direction}
                for t in tickers
            ],
            "startup_ideas": [
                {"id": s.id, "name": s.name, "description": s.description}
                for s in ideas
            ],
            "children": [build_node(c) for c in sorted(children, key=lambda x: x.sort_order)],
        }

    root_nodes = [n for n in nodes if n.parent_id is None]
    if not root_nodes:
        return {"tree": None}

    return {"tree": build_node(root_nodes[0])}


@router.get("/flat")
def get_tree_flat(thesis_id: int, db: Session = Depends(get_db)):
    """Get all tree nodes as a flat list (useful for React Flow)."""
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    nodes = db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).all()
    result = []

    for node in nodes:
        tickers = db.query(NodeTicker).filter(NodeTicker.node_id == node.id).all()
        ideas = db.query(StartupIdea).filter(StartupIdea.node_id == node.id).all()

        result.append({
            "id": node.id,
            "parent_id": node.parent_id,
            "node_type": node.node_type,
            "label": node.label,
            "description": node.description,
            "sort_order": node.sort_order,
            "user_conviction": node.user_conviction,
            "tickers": [
                {"id": t.id, "symbol": t.symbol, "rationale": t.rationale, "direction": t.direction}
                for t in tickers
            ],
            "startup_ideas": [
                {"id": s.id, "name": s.name, "description": s.description}
                for s in ideas
            ],
        })

    return {"nodes": result}


@router.post("/regenerate")
def regenerate_tree(thesis_id: int, db: Session = Depends(get_db)):
    """Delete existing tree nodes and re-generate via AI."""
    thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
    if not thesis:
        raise HTTPException(status_code=404, detail="Thesis not found")

    logger.info("Regenerating tree for thesis %d: %s", thesis_id, thesis.title)

    # Delete existing tree data (cascades to tickers and startup_ideas via relationships)
    db.query(StartupIdea).filter(
        StartupIdea.node_id.in_(
            db.query(TreeNode.id).filter(TreeNode.thesis_id == thesis_id)
        )
    ).delete(synchronize_session=False)
    db.query(NodeTicker).filter(
        NodeTicker.node_id.in_(
            db.query(TreeNode.id).filter(TreeNode.thesis_id == thesis_id)
        )
    ).delete(synchronize_session=False)
    db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).delete()
    db.flush()

    try:
        tree_data = generate_thesis_tree(thesis.title)
        store_thesis_tree(db, thesis, tree_data)
        node_count = db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).count()
        logger.info("  -> Regenerated with %d nodes", node_count)
        return {"ok": True, "node_count": node_count}
    except Exception as e:
        logger.error("  -> Regeneration failed for '%s': %s", thesis.title, e)
        db.rollback()
        # Ensure at least root node exists
        db.add(TreeNode(
            thesis_id=thesis.id,
            parent_id=None,
            node_type="thesis",
            label=thesis.title,
            description=thesis.description or "",
            sort_order=0,
        ))
        db.commit()
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")
