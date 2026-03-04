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
    """Seed the database with theses data, adding any new entries from the seed file."""
    db = SessionLocal()
    try:
        seed_path = Path(__file__).parent / "seed" / "theses_seed.json"
        if not seed_path.exists():
            return

        with open(seed_path) as f:
            seed_data = json.load(f)

        existing_titles = {t.title for t in db.query(Thesis.title).all()}
        new_entries = [t for t in seed_data if t["title"] not in existing_titles]

        if not new_entries:
            return

        new_thesis_ids = []
        for thesis_data in new_entries:
            thesis = Thesis(
                title=thesis_data["title"],
                description=thesis_data.get("description", ""),
                keywords=thesis_data.get("keywords", []),
                activation_date=datetime.datetime.fromisoformat(thesis_data["activation_date"]) if thesis_data.get("activation_date") else None,
            )
            db.add(thesis)
            db.flush()
            new_thesis_ids.append(thesis.id)

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
        print(f"Seeded {len(new_entries)} new theses ({db.query(Thesis).count()} total)")

        # Try to generate AI trees for new theses if API key available
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        if api_key and not api_key.startswith("your_"):
            _generate_seed_trees(db, thesis_ids=new_thesis_ids)

    except Exception as e:
        print(f"Seed error: {e}")
        db.rollback()
    finally:
        db.close()


def _generate_seed_trees(db, thesis_ids=None):
    """Generate AI trees for seeded theses."""
    from .services.ai_service import generate_thesis_tree, store_thesis_tree

    query = db.query(Thesis)
    if thesis_ids:
        query = query.filter(Thesis.id.in_(thesis_ids))
    theses = query.all()
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


def regenerate_incomplete_trees():
    """Scan for theses with only a root node and regenerate their trees."""
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key or api_key.startswith("your_"):
        print("[startup] Skipping tree regeneration — no valid ANTHROPIC_API_KEY")
        return

    db = SessionLocal()
    try:
        from .services.ai_service import generate_thesis_tree, store_thesis_tree

        # Find theses with only 1 node (root only)
        from sqlalchemy import func
        incomplete = (
            db.query(Thesis.id, Thesis.title, func.count(TreeNode.id).label("node_count"))
            .join(TreeNode, TreeNode.thesis_id == Thesis.id)
            .group_by(Thesis.id)
            .having(func.count(TreeNode.id) <= 1)
            .all()
        )

        if not incomplete:
            print("[startup] All theses have complete trees")
            return

        print(f"[startup] Found {len(incomplete)} theses with incomplete trees, regenerating...")
        for thesis_id, title, node_count in incomplete:
            thesis = db.query(Thesis).filter(Thesis.id == thesis_id).first()
            try:
                print(f"[startup]   Regenerating: {title}")
                # Delete existing root node
                db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).delete()
                db.flush()

                tree_data = generate_thesis_tree(title)
                store_thesis_tree(db, thesis, tree_data)
                new_count = db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).count()
                print(f"[startup]   -> OK: {new_count} nodes")
            except Exception as e:
                print(f"[startup]   -> FAILED: {title}: {e}")
                db.rollback()
                # Ensure root node exists
                if db.query(TreeNode).filter(TreeNode.thesis_id == thesis_id).count() == 0:
                    db.add(TreeNode(
                        thesis_id=thesis_id,
                        parent_id=None,
                        node_type="thesis",
                        label=title,
                        description=thesis.description or "",
                        sort_order=0,
                    ))
                    db.commit()

        print("[startup] Tree regeneration complete")
    except Exception as e:
        print(f"[startup] Tree regeneration error: {e}")
        db.rollback()
    finally:
        db.close()


def _auto_refresh_evidence():
    """Auto-refresh evidence scores on startup if stale (>24h)."""
    import threading
    def _run():
        import time as _time
        _time.sleep(10)  # Wait for server to be ready
        try:
            from .routers.evidence import _refresh_all_evidence_background
            _refresh_all_evidence_background()
        except Exception as e:
            print(f"[evidence] Auto-refresh error: {e}")
    t = threading.Thread(target=_run, daemon=True)
    t.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
    regenerate_incomplete_trees()
    from .services.score_cache import start_background_updater, stop_background_updater
    start_background_updater()
    _auto_refresh_evidence()
    yield
    stop_background_updater()


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
app.include_router(tree.node_router)
app.include_router(conviction.router)
app.include_router(evidence.router)
app.include_router(news.router)
app.include_router(bets.router)
app.include_router(macro.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0"}
