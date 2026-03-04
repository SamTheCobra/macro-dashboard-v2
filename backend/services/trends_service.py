import time
import logging
from pytrends.request import TrendReq

logger = logging.getLogger(__name__)


def _score_momentum(recent_avg: float, earlier_avg: float) -> float:
    """Score trend momentum on 1-10 scale based on % change."""
    if earlier_avg <= 0:
        return 5.0
    pct_change = (recent_avg - earlier_avg) / earlier_avg * 100
    if pct_change > 50:
        return 10.0
    elif pct_change > 25:
        return 8.0
    elif pct_change > 10:
        return 7.0
    elif pct_change >= -10:
        return 5.0
    elif pct_change >= -25:
        return 3.0
    else:
        return 1.0


def _score_recency(last_30_avg: float, prev_30_avg: float) -> float:
    """Score recency bonus based on last 30 vs previous 30 days."""
    if prev_30_avg <= 0:
        return 5.0
    pct_change = (last_30_avg - prev_30_avg) / prev_30_avg * 100
    if pct_change > 30:
        return 10.0
    elif pct_change > 10:
        return 7.0
    elif pct_change >= -10:
        return 5.0
    else:
        return 2.0


def get_evidence_score(keywords: list[str]) -> dict | None:
    """Fetch Google Trends data for keywords and compute evidence scores.

    Returns dict with trend_momentum, keyword_breadth, recency_bonus,
    final_score, and raw trend_data. Returns None on failure.
    """
    if not keywords:
        return None

    # Limit to 5 keywords (pytrends limit)
    kw_list = keywords[:5]

    try:
        pytrends = TrendReq(hl='en-US', tz=360, timeout=(10, 25))
        pytrends.build_payload(kw_list, cat=0, timeframe='today 12-m', geo='', gprop='')
        time.sleep(2)  # Rate limit protection

        df = pytrends.interest_over_time()
        if df is None or df.empty:
            logger.warning(f"No trend data returned for keywords: {kw_list}")
            return None

        # Remove 'isPartial' column if present
        if 'isPartial' in df.columns:
            df = df.drop(columns=['isPartial'])

        # Calculate momentum: last 3 months avg vs previous 9 months avg
        total_rows = len(df)
        # ~13 weeks = 3 months for weekly data
        split_point = max(total_rows - 13, 1)
        recent_df = df.iloc[split_point:]
        earlier_df = df.iloc[:split_point]

        # Per-keyword momentum scores
        keyword_momentums = []
        growing_count = 0
        for kw in kw_list:
            if kw not in df.columns:
                continue
            recent_avg = recent_df[kw].mean()
            earlier_avg = earlier_df[kw].mean()
            keyword_momentums.append(_score_momentum(recent_avg, earlier_avg))
            if earlier_avg > 0 and (recent_avg - earlier_avg) / earlier_avg > 0.2:
                growing_count += 1

        if not keyword_momentums:
            return None

        trend_momentum = sum(keyword_momentums) / len(keyword_momentums)

        # Keyword breadth: proportion of keywords showing >20% growth
        keyword_breadth = (growing_count / len(keyword_momentums)) * 10

        # Recency bonus: last ~4 weeks vs previous ~4 weeks
        recency_split = max(total_rows - 4, 1)
        prev_recency_start = max(recency_split - 4, 0)
        last_30 = df.iloc[recency_split:]
        prev_30 = df.iloc[prev_recency_start:recency_split]

        recency_scores = []
        for kw in kw_list:
            if kw not in df.columns:
                continue
            last_avg = last_30[kw].mean()
            prev_avg = prev_30[kw].mean()
            recency_scores.append(_score_recency(last_avg, prev_avg))

        recency_bonus = sum(recency_scores) / len(recency_scores) if recency_scores else 5.0

        # Final composite score
        final_score = round(
            trend_momentum * 0.5 + keyword_breadth * 0.3 + recency_bonus * 0.2,
            1
        )
        final_score = max(1.0, min(10.0, final_score))

        # Build trend data summary for API response
        trend_data = {
            "keywords_queried": kw_list,
            "trend_momentum": round(trend_momentum, 1),
            "keyword_breadth": round(keyword_breadth, 1),
            "recency_bonus": round(recency_bonus, 1),
            "growing_keywords": growing_count,
            "total_keywords": len(keyword_momentums),
        }

        return {
            "trend_momentum": round(trend_momentum, 1),
            "keyword_breadth": round(keyword_breadth, 1),
            "recency_bonus": round(recency_bonus, 1),
            "final_score": final_score,
            "trend_data": trend_data,
        }

    except Exception as e:
        logger.error(f"Google Trends fetch failed for {kw_list}: {e}")
        return None
