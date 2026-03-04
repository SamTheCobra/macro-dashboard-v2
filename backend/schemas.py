from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ThesisCreate(BaseModel):
    title: str


class ThesisUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    keywords: Optional[list[str]] = None


class ThesisOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    activation_date: Optional[datetime] = None
    keywords: list = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    conviction_score: Optional[float] = None
    evidence_score: Optional[float] = None
    health_score: Optional[float] = None
    news_pulse: Optional[float] = None
    node_count: int = 0
    top_tickers: list[str] = []
    last_evidence_refresh: Optional[datetime] = None

    model_config = {"from_attributes": True}


class TreeNodeOut(BaseModel):
    id: int
    thesis_id: int
    parent_id: Optional[int] = None
    node_type: str
    label: str
    description: Optional[str] = None
    sort_order: int = 0
    tickers: list = []
    startup_ideas: list = []
    children: list = []

    model_config = {"from_attributes": True}


class NodeTickerOut(BaseModel):
    id: int
    node_id: int
    symbol: str
    rationale: Optional[str] = None
    direction: str = "long"

    model_config = {"from_attributes": True}


class StartupIdeaOut(BaseModel):
    id: int
    node_id: int
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


class ConvictionCreate(BaseModel):
    score: int
    note: Optional[str] = None


class ConvictionOut(BaseModel):
    id: int
    thesis_id: int
    date: Optional[datetime] = None
    score: int
    note: Optional[str] = None

    model_config = {"from_attributes": True}


class NewsArticleOut(BaseModel):
    id: int
    thesis_id: int
    title: str
    url: Optional[str] = None
    source: Optional[str] = None
    published_at: Optional[datetime] = None
    classification: Optional[str] = None
    summary: Optional[str] = None
    fetched_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BetCreate(BaseModel):
    ticker: str
    direction: str = "long"
    entry_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    position_size_pct: Optional[float] = None
    status: str = "watching"
    notes: Optional[str] = None


class BetUpdate(BaseModel):
    ticker: Optional[str] = None
    direction: Optional[str] = None
    entry_price: Optional[float] = None
    current_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    position_size_pct: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BetOut(BaseModel):
    id: int
    thesis_id: int
    ticker: str
    direction: str
    entry_price: Optional[float] = None
    current_price: Optional[float] = None
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    position_size_pct: Optional[float] = None
    status: str
    notes: Optional[str] = None
    pnl_pct: Optional[float] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class MacroRegime(BaseModel):
    regime: str
    confidence: str
    fed_funds_rate: Optional[float] = None
    yield_spread: Optional[float] = None
    vix: Optional[float] = None


class HealthScoreDetail(BaseModel):
    conviction_score: float
    evidence_score: float
    health_score: float
    ticker_performance_score: float
    news_pulse_score: float
