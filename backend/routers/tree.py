from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Thesis, TreeNode, NodeTicker, StartupIdea

router = APIRouter(prefix="/api/theses/{thesis_id}/tree", tags=["tree"])


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
