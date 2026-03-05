"""Score cache for thesis evidence scores.

Provides simple in-memory caching of computed scores.
No background threads — scores are only computed on explicit user action.
"""

import threading

# In-memory score cache: {thesis_id: {scores_dict}}
_score_cache: dict[int, dict] = {}
_cache_lock = threading.Lock()


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
