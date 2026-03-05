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
from .routers import theses, tree, conviction, evidence, news, bets, macro


def seed_if_empty():
    """Seed the database from the seed file. Returns immediately if empty or missing."""
    seed_path = Path(__file__).parent / "seed" / "theses_seed.json"
    if not seed_path.exists():
        return

    with open(seed_path) as f:
        seed_data = json.load(f)

    if not seed_data:
        return


def _auto_refresh_evidence():
    """Auto-refresh evidence scores on startup if stale (>24h)."""
    import threading
    def _run():
        import time as _time
        print("[evidence-refresh] Scheduled — waiting 10s for server readiness...")
        _time.sleep(10)
        try:
            print("[evidence-refresh] Starting auto-refresh...")
            from .routers.evidence import _refresh_all_evidence_background
            _refresh_all_evidence_background()
        except Exception as e:
            print(f"[evidence-refresh] Auto-refresh error: {e}")
            import traceback
            traceback.print_exc()
    t = threading.Thread(target=_run, daemon=True)
    t.start()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_if_empty()
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
