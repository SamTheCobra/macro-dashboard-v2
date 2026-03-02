import os
import json
import datetime
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db, SessionLocal
from .models import Thesis, TreeNode, NodeTicker, StartupIdea, ConvictionEntry, Bet
from .routers import theses, tree, conviction, evidence, news, bets, macro


def seed_if_empty():
    """Seed the database with v1 theses data if empty (without AI generation)."""
    db = SessionLocal()
    try:
        count = db.query(Thesis).count()
        if count > 0:
            return

        seed_path = Path(__file__).parent / "seed" / "theses_seed.json"
        if not seed_path.exists():
            return

        with open(seed_path) as f:
            seed_data = json.load(f)

        for thesis_data in seed_data:
            thesis = Thesis(
                title=thesis_data["title"],
                description=thesis_data.get("description", ""),
                keywords=thesis_data.get("keywords", []),
                activation_date=datetime.datetime.fromisoformat(thesis_data["activation_date"]) if thesis_data.get("activation_date") else None,
            )
            db.add(thesis)
            db.flush()

            # Create a basic tree structure from seed data
            root_node = TreeNode(
                thesis_id=thesis.id,
                parent_id=None,
                node_type="thesis",
                label=thesis.title,
                description=thesis.description,
                sort_order=0,
            )
            db.add(root_node)
            db.flush()

            # Add conviction entries
            for entry in thesis_data.get("conviction_entries", []):
                db.add(ConvictionEntry(
                    thesis_id=thesis.id,
                    score=entry["score"],
                    note=entry.get("note", ""),
                    date=datetime.datetime.fromisoformat(entry["date"]) if entry.get("date") else None,
                ))

            # Add bets
            for bet_data in thesis_data.get("bets", []):
                db.add(Bet(
                    thesis_id=thesis.id,
                    ticker=bet_data["ticker"],
                    direction=bet_data.get("direction", "long"),
                    entry_price=bet_data.get("entry_price"),
                    target_price=bet_data.get("target_price"),
                    stop_loss=bet_data.get("stop_loss"),
                    position_size_pct=bet_data.get("position_size_pct"),
                    status=bet_data.get("status", "watching"),
                    notes=bet_data.get("notes"),
                ))

        db.commit()
        print(f"Seeded {len(seed_data)} theses from v1 data")

        # Try to generate AI trees for seeded theses if API key available
        if os.getenv("ANTHROPIC_API_KEY"):
            _generate_seed_trees(db)

    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()


def _generate_seed_trees(db):
    """Generate AI trees for seeded theses."""
    from .services.ai_service import generate_thesis_tree, store_thesis_tree

    theses = db.query(Thesis).all()
    for thesis in theses:
        # Skip if already has tree nodes beyond root
        node_count = db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).count()
        if node_count > 1:
            continue

        try:
            print(f"Generating tree for: {thesis.title}")
            tree_data = generate_thesis_tree(thesis.title)

            # Remove existing root node (will be recreated)
            db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).delete()
            db.flush()

            store_thesis_tree(db, thesis, tree_data)
            print(f"  -> Tree generated with {db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).count()} nodes")
        except Exception as e:
            print(f"  -> AI generation failed for '{thesis.title}': {e}")
            # Ensure at least root node exists
            if db.query(TreeNode).filter(TreeNode.thesis_id == thesis.id).count() == 0:
                db.add(TreeNode(
                    thesis_id=thesis.id,
                    parent_id=None,
                    node_type="thesis",
                    label=thesis.title,
                    description=thesis.description,
                    sort_order=0,
                ))
                db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    yield


app = FastAPI(title="Macro Dashboard v2", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(theses.router)
app.include_router(tree.router)
app.include_router(conviction.router)
app.include_router(evidence.router)
app.include_router(news.router)
app.include_router(bets.router)
app.include_router(macro.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0"}
