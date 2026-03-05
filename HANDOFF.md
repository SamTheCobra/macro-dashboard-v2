# Macro Dashboard v2 — Project Handoff

## Context-Setter (paste at top of new chat)

> I'm working on macro-dashboard-v2, a personal macro investing tool. It's a React + FastAPI app where you input investment theses (e.g., "Aging boomers will drive healthcare demand"), Claude AI generates a causal tree (thesis → 2nd order → 3rd order effects with tickers and startup ideas at each level), and then you track evidence via Google Trends, news sentiment, conviction sliders, and health scores. The repo is at ~/macro-dashboard-v2. Please read HANDOFF.md for full project context before we begin.

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + Vite | React 19.2, Vite 7.3 |
| Routing | react-router-dom | 7.13 |
| Styling | Tailwind CSS 4.2 + CSS variables + inline styles | — |
| Icons | lucide-react | 0.576 |
| HTTP | axios | 1.13 |
| Backend | FastAPI + Uvicorn | FastAPI 0.115, Uvicorn 0.34 |
| ORM | SQLAlchemy 2.0 | SQLite default |
| AI | Anthropic Claude Sonnet 4 | anthropic 0.42 |
| Market Data | yfinance 0.2.51 | — |
| Trends | pytrends 4.9.2 | — |
| News | NewsAPI (REST) | via requests |
| Macro Data | FRED API | via requests |

**No TypeScript. No test suite. No Alembic** — migrations are manual ALTER TABLEs in `database.py`.

---

## File Tree

```
macro-dashboard-v2/
├── .env / .env.example          # ANTHROPIC_API_KEY, FRED_API_KEY, NEWS_API_KEY
├── Makefile                     # `make start` runs both servers
├── run.sh                       # Alternative setup script
├── macro_dashboard_v2.db        # SQLite database (gitignored)
│
├── backend/
│   ├── main.py                  # FastAPI app, CORS, router registration, seed data
│   ├── database.py              # SQLAlchemy engine, SessionLocal, init_db(), manual migrations
│   ├── models.py                # 10 SQLAlchemy models
│   ├── schemas.py               # Pydantic request/response models
│   ├── requirements.txt
│   │
│   ├── routers/
│   │   ├── theses.py            # CRUD for theses (GET/POST/PUT/DELETE /api/theses)
│   │   ├── tree.py              # Tree structure + node conviction + regenerate
│   │   ├── conviction.py        # Conviction time-series entries
│   │   ├── evidence.py          # Google Trends evidence refresh
│   │   ├── news.py              # NewsAPI fetch + AI classification
│   │   ├── bets.py              # Position tracking with PnL
│   │   └── macro.py             # FRED-based macro regime detection
│   │
│   ├── services/
│   │   ├── ai_service.py        # Claude: tree generation + headline classification
│   │   ├── scoring_service.py   # Health score = f(conviction, evidence, news)
│   │   ├── score_cache.py       # Thread-safe in-memory score cache
│   │   ├── trends_service.py    # Google Trends → evidence score (1-10)
│   │   ├── news_service.py      # NewsAPI + AI classification → news pulse
│   │   ├── market_service.py    # yfinance with caching + rate limiting
│   │   └── fred_service.py      # FRED API for macro regime
│   │
│   └── seed/
│       └── theses_seed.json     # Empty (was pre-populated, user cleared it)
│
└── frontend/
    ├── package.json
    ├── vite.config.js           # Port 5174, proxy /api → localhost:8000
    ├── index.html
    │
    └── src/
        ├── main.jsx             # React entry point
        ├── App.jsx              # BrowserRouter: / → Dashboard, /thesis/:id → ThesisDetail
        ├── index.css            # CSS variables (dark/light themes), fonts, slider styles
        │
        ├── contexts/
        │   └── ThemeContext.jsx  # Dark/light theme toggle (localStorage persisted)
        │
        ├── pages/
        │   ├── Dashboard.jsx    # Thesis list + new thesis modal + hero branding
        │   └── ThesisDetail.jsx # Fetches thesis + tree, renders TreeView + tabs
        │
        ├── components/
        │   ├── Layout.jsx       # App shell: header nav + theme toggle + Outlet
        │   ├── TreeView.jsx     # *** MAIN COMPONENT (1350+ lines) *** — see below
        │   ├── ThesisCard.jsx   # Dashboard card with health ring + badges
        │   ├── NewThesisModal.jsx # Modal for creating new thesis
        │   ├── HealthGauge.jsx  # SVG circular progress ring
        │   ├── EvidenceChart.jsx # Evidence metrics grid + breakdown tooltip
        │   ├── ConvictionLog.jsx # Conviction history list
        │   ├── NewsPulse.jsx    # News headlines with classification badges
        │   ├── BetsTracker.jsx  # Position entry/tracking table
        │   ├── HealthTab.jsx    # Tab container for Evidence/Conviction/News/Bets
        │   └── NodePanel.jsx    # (unused/minimal)
        │
        └── utils/
            └── api.js           # axios wrapper: all API endpoints
```

---

## Architecture & Data Flow

### Core Loop
```
User enters thesis title
  → Claude AI generates causal tree (3 × 2nd-order, each with 3 × 3rd-order)
  → Each node gets: tickers (with rationale + direction), startup ideas, sector ETF
  → User adjusts conviction sliders at every tree level
  → Evidence refreshed via Google Trends (keyword momentum, breadth, recency)
  → News fetched via NewsAPI, classified by Claude (confirming/neutral/contradicting)
  → Health Score = (weighted conviction × 0.4 + evidence × 0.6) × 10
```

### Scoring Pipeline
```
Health Score (0-100) = (conviction × 0.4 + evidence × 0.6) × 10

Conviction (0-10) = weighted average:
  - Root slider:    40%
  - 2nd-order avg:  35%
  - 3rd-order avg:  25%

Evidence (0-10) = Google Trends composite:
  - Trend momentum:  50%  (last 3mo vs previous 9mo)
  - Keyword breadth:  30%  (% of keywords growing >20%)
  - Recency bonus:    20%  (last 4wk vs previous 4wk)

News Pulse (0-10) = confirming / (confirming + contradicting) × 10 over 30 days
```

### Key Architectural Decisions
1. **SQLite, no Alembic** — Single-user app. Migrations via `_migrate_add_columns()` in `database.py`. Any new column needs an ALTER TABLE there.
2. **No background workers** — Evidence refresh is synchronous per-thesis (with rate limiting). Bulk refresh is a FastAPI BackgroundTask.
3. **In-memory score cache** — `score_cache.py` is a simple dict, not Redis. Fine for single-process.
4. **Inline styles everywhere** — Frontend uses CSS variables + inline style objects. No CSS modules, no styled-components. This is intentional.
5. **TreeView.jsx is the god component** — 1350+ lines. Contains HeroCard, SecondOrderCard, ThirdOrderCard, TickerChart, ConvictionSlider, HealthRing, StickyHeroBar, TickersList, IdeasList, and all conviction/health state management. Not decomposed into separate files on purpose — it's one interconnected tree.
6. **Mock data for sparklines** — `TickerChart` uses `mockSparkline()` with seeded randomness, NOT real price data. The sparklines are cosmetic. Real price data is only used in BetsTracker.
7. **Claude Sonnet 4 for generation** — Model: `claude-sonnet-4-20250514`. Tree generation prompt is ~150 lines of detailed instructions for tone, specificity, and format.

---

## Current State (What Works)

- **Thesis creation** — Enter title → Claude generates full causal tree → stored in DB
- **Tree visualization** — HeroCard (root) → 2nd order cards (3-column grid) → 3rd order cards (nested under each)
- **Conviction sliders** — At every tree level. Root saves to ConvictionEntry; child nodes save to TreeNode.user_conviction. All feed into weighted health score.
- **Evidence refresh** — Click refresh → calls Google Trends for thesis keywords → computes score → stores breakdown for tooltip
- **Evidence tooltip** — Hover over Evidence score → shows keywords searched, momentum, breadth, recent headlines
- **News fetch + classification** — NewsAPI → Claude classifies each headline → news pulse score
- **Health score** — Computed on backend, displayed as animated SVG ring with tooltip breakdown
- **Inline title editing** — Click pencil on thesis title → edit in-place → saves via PUT
- **Bets tracker** — CRUD for positions with PnL calculation
- **Macro regime** — FRED data → determines Risk-On/Off, Tightening, Easing, etc.
- **Dark/light theme** — Full CSS variable system, toggle in header
- **Sticky hero bar** — Scrolls past hero → collapsed bar appears with health ring + tickers
- **Ticker links** — All ticker symbols link to Yahoo Finance in new tab
- **Delete thesis** — Trash icon on hero card

---

## Known Bugs & Limitations

1. **Sparklines are fake** — `TickerChart` uses seeded random data, not real price history. `mockSparkline()` generates cosmetic lines. Real yfinance data is only used in bets PnL.
2. **Ticker name lookup is a hardcoded map** — `getTickerName()` in TreeView.jsx has ~30 entries. Unknown tickers show no name.
3. **Sector ETF inference is keyword-matching** — `inferSectorETF()` uses string matching on labels/descriptions. Often wrong.
4. **Google Trends rate limiting** — pytrends gets 429'd frequently. 60s retry backoff, max 3 attempts. Bulk refresh has 10s delays between theses.
5. **NewsAPI free tier** — Limited to 100 requests/day, headlines only from last 30 days.
6. **No authentication** — Single-user app, no auth layer.
7. **No tests** — Zero test files exist.
8. **SQLite create_all won't add columns** — Must manually add ALTER TABLE to `_migrate_add_columns()` for any new column.
9. **ConvictionEntry is append-only** — PUT conviction creates a new entry (doesn't update). Score reads latest by date.
10. **Evidence breakdown is null until first refresh** — Tooltip shows nothing until user clicks refresh.
11. **Tree regeneration loses conviction data** — Regenerating the tree deletes all TreeNodes, including user_conviction values.

---

## Gotchas & Tricky Details

- **Vite proxy**: Frontend runs on `:5174`, proxies `/api` to backend on `:8000`. Change both in `vite.config.js` and the Makefile if you move ports.
- **CORS**: Backend allows `localhost:5173` and `localhost:5174` in `main.py`. Add new origins there if needed.
- **JSON cleaning**: `_clean_json_response()` in ai_service.py strips markdown fences and trailing commas. Claude sometimes wraps JSON in ```json blocks.
- **Font stack**: Space Grotesk (sans) + JetBrains Mono (mono), loaded via Google Fonts CDN in index.css.
- **CSS variable system**: ~45 variables per theme. All components reference them via `var(--color-*)`. The complete list is in `index.css`.
- **Health score recalculation**: After conviction change, frontend calls `putConviction()` then re-fetches thesis to get updated health score from backend. There's a 200ms debounce + 500ms API delay.
- **evidence_breakdown column**: JSON column on Thesis model. Stores `{keywords_queried, trend_momentum, keyword_breadth, recency_bonus, recent_headlines}`. Added via migration in database.py.
- **TreeView state management**: All conviction state lives in `TreeView` via `useState` + `useMemo`. `soConvictions` and `toConvictions` are objects keyed by node ID. Changes debounce 500ms before API call.
- **StickyHeroBar**: Uses IntersectionObserver on the hero card ref. When hero scrolls out of view, sticky bar fades in at `top: 52px` (below the header).

---

## Environment Setup

```bash
cd ~/macro-dashboard-v2

# Backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install && cd ..

# Environment variables
cp .env.example .env
# Edit .env with your API keys:
#   ANTHROPIC_API_KEY  — required for thesis generation
#   FRED_API_KEY       — required for macro regime
#   NEWS_API_KEY       — required for news fetch

# Run both servers
make start
# Or separately:
#   make backend   (uvicorn on :8000)
#   make frontend  (vite on :5174)
```

---

## API Endpoints Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/theses` | List theses (sorted by health) |
| POST | `/api/theses` | Create + AI generate tree |
| GET | `/api/theses/:id` | Single thesis with scores |
| PUT | `/api/theses/:id` | Update title/status/keywords |
| DELETE | `/api/theses/:id` | Delete thesis |
| GET | `/api/theses/:id/tree` | Nested tree structure |
| GET | `/api/theses/:id/tree/flat` | Flat node list |
| POST | `/api/theses/:id/tree/regenerate` | Regenerate tree via AI |
| PUT | `/api/tree-nodes/:id/conviction` | Update node conviction |
| GET | `/api/theses/:id/conviction` | Conviction history |
| PUT | `/api/theses/:id/conviction` | Set conviction (appends entry) |
| GET | `/api/theses/:id/evidence` | Evidence scores + breakdown |
| POST | `/api/theses/:id/refresh-evidence` | Refresh via Google Trends |
| POST | `/api/evidence/refresh-all` | Background bulk refresh |
| GET | `/api/theses/:id/news` | Recent headlines |
| POST | `/api/theses/:id/news/fetch` | Fetch + classify new headlines |
| GET | `/api/theses/:id/news/pulse` | News pulse score |
| GET/POST/PUT/DELETE | `/api/theses/:id/bets` | Position CRUD |
| GET | `/api/regime/current` | Macro regime |
| GET | `/api/health` | Health check |

---

## Code Conventions

- **Backend**: Python 3.11+, FastAPI with dependency injection, SQLAlchemy 2.0 style queries, Pydantic v2 schemas
- **Frontend**: Functional components only, hooks (useState/useEffect/useMemo/useCallback/useRef), no class components
- **Styling**: Inline style objects referencing CSS variables. No className-based styling except for Tailwind utilities in rare spots
- **State**: Local component state only, no Redux/Zustand. Parent-to-child prop drilling. API calls in useEffect or event handlers
- **API calls**: All go through `utils/api.js` which creates an axios instance with `/api` baseURL
- **Naming**: camelCase in JS, snake_case in Python. Component files are PascalCase.jsx
- **No TypeScript, no PropTypes** — pure JS throughout
- **Commit messages**: Imperative mood, 1-2 sentence summary, detail in body

---

## ~5,300 total lines of code across 30 source files.
