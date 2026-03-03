"""Background score cache for thesis evidence scores.

Avoids blocking API responses with yfinance calls by pre-computing scores
in a background thread and serving cached values to API endpoints.
"""

import threading
import time
import logging
from ..database import SessionLocal

logger = logging.getLogger(__name__)

# In-memory score cache: {thesis_id: {scores_dict}}
_score_cache: dict[int, dict] = {}
_cache_lock = threading.Lock()
_updater_thread: threading.Thread | None = None
_stop_event = threading.Event()

STARTUP_DELAY = 30  # seconds before first market data fetch
UPDATE_INTERVAL = 1800  # 30 minutes between full refreshes


def get_cached_scores(thesis_id: int) -> dict | None:
    """Return cached scores for a thesis, or None if not yet computed."""
    with _cache_lock:
        return _score_cache.get(thesis_id)


def set_cached_scores(thesis_id: int, scores: dict):
    """Store computed scores in the cache."""
    with _cache_lock:
        _score_cache[thesis_id] = scores


def invalidate_cache(thesis_id: int):
    """Remove cached scores for a thesis (e.g. after deletion)."""
    with _cache_lock:
        _score_cache.pop(thesis_id, None)


def _update_all_scores():
    """Fetch and cache scores for all active theses."""
    from ..models import Thesis
    from .scoring_service import get_all_scores

    db = SessionLocal()
    try:
        theses = db.query(Thesis).filter(Thesis.status == "active").all()
        for thesis in theses:
            if _stop_event.is_set():
                return
            try:
                scores = get_all_scores(db, thesis)
                set_cached_scores(thesis.id, scores)
                logger.info(f"Updated scores for thesis {thesis.id}: {thesis.title}")
            except Exception as e:
                logger.error(f"Failed to update scores for thesis {thesis.id}: {e}")
    finally:
        db.close()


def _background_worker():
    """Background thread: wait startup delay, then periodically update scores."""
    logger.info(f"Score updater: waiting {STARTUP_DELAY}s before first market data fetch...")
    if _stop_event.wait(STARTUP_DELAY):
        return

    while not _stop_event.is_set():
        try:
            logger.info("Score updater: refreshing all thesis scores...")
            _update_all_scores()
            logger.info("Score updater: refresh complete.")
        except Exception as e:
            logger.error(f"Score updater error: {e}")

        if _stop_event.wait(UPDATE_INTERVAL):
            return


def start_background_updater():
    """Start the background score updater thread."""
    global _updater_thread
    if _updater_thread is not None:
        return

    _stop_event.clear()
    _updater_thread = threading.Thread(target=_background_worker, daemon=True, name="score-updater")
    _updater_thread.start()
    logger.info("Background score updater started.")


def stop_background_updater():
    """Signal the background thread to stop."""
    global _updater_thread
    _stop_event.set()
    if _updater_thread is not None:
        _updater_thread.join(timeout=5)
        _updater_thread = None
    logger.info("Background score updater stopped.")
