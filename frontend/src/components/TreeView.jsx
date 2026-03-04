import { useState, useEffect, useMemo, useCallback } from 'react';
import { Lightbulb, Trash2 } from 'lucide-react';
import { getConviction, addConviction } from '../utils/api';

// ---------- Mock data generators ----------

function seededRandom(seed) {
  return () => {
    seed = (seed * 16807 + 7) % 2147483647;
    return (seed & 0x7fffffff) / 0x7fffffff;
  };
}

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function mockSparkline(symbol) {
  const rand = seededRandom(hashStr(symbol));
  const points = [];
  let val = 50;
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    val += (rand() - 0.46) * 8;
    val = Math.max(10, Math.min(90, val));
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    points.push({ value: val, date: `${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}` });
  }
  return points;
}

function mockNodeConfidence(label) {
  return 40 + (hashStr(label) % 55);
}

// Curated fallback startup ideas keyed by hash bucket
const FALLBACK_IDEAS = [
  [{ name: 'SignalDrift', description: 'Alerts retail traders when institutional flows diverge from price action' },
   { name: 'MacroPulse', description: 'Weekly SMS digest that explains what the Fed actually said, in plain English' },
   { name: 'TrendLock', description: 'Auto-rebalances your portfolio when macro regime shifts — no thinking required' }],
  [{ name: 'ShelfLife', description: 'Tracks which consumer brands are losing shelf space to new entrants in real time' },
   { name: 'DemandFlip', description: 'Predicts demand crashes 90 days out by scraping supplier order books' },
   { name: 'PriceGhost', description: 'Shows you the "real" inflation rate for your specific spending habits' }],
  [{ name: 'ChainPing', description: 'Monitors supply chain bottlenecks and pings you before they hit earnings' },
   { name: 'EdgeBook', description: 'Crowdsourced investment memos from industry insiders, ranked by track record' },
   { name: 'BetaBreak', description: 'Finds stocks that stopped correlating with their sector — usually means something big is happening' }],
  [{ name: 'FlowHound', description: 'Tracks dark pool activity and unusual options flow in one clean dashboard' },
   { name: 'NarrativeAI', description: 'Scores how much a stock is trading on story vs fundamentals right now' },
   { name: 'CycleSense', description: 'Maps where we are in the business cycle and what historically works next' }],
];

function getRootIdeas(tree) {
  // Use actual startup_ideas from root node if available
  if (tree.startup_ideas && tree.startup_ideas.length > 0) {
    return tree.startup_ideas.slice(0, 3);
  }
  // Deterministic fallback based on thesis title
  const bucket = hashStr(tree.label) % FALLBACK_IDEAS.length;
  return FALLBACK_IDEAS[bucket];
}

function mockTickerDescription(symbol, direction) {
  const descs = {
    SPY: 'S&P 500 ETF, broad US equity market proxy',
    QQQ: 'Nasdaq-100 ETF, tech-heavy large cap exposure',
    TLT: 'Long-term treasury ETF, inverse rate sensitivity',
    GLD: 'Gold ETF, inflation and debasement hedge',
    SLV: 'Silver ETF, industrial-monetary hybrid play',
    UUP: 'US Dollar Index ETF, dollar strength tracker',
    XLF: 'Financial sector ETF, rate-sensitive banks',
    XLE: 'Energy sector ETF, oil & gas producers',
    XLK: 'Technology sector ETF, mega-cap tech',
    XLV: 'Healthcare sector ETF, pharma & biotech',
    IWM: 'Russell 2000 ETF, small-cap US equities',
    EEM: 'Emerging markets ETF, developing economy exposure',
    KRE: 'Regional bank ETF, most leveraged to yield curve',
    ARKK: 'Disruptive innovation ETF, high-growth tech bets',
    NVDA: 'AI chip leader, GPU compute infrastructure',
    MSFT: 'Cloud & AI platform, enterprise software giant',
    AAPL: 'Consumer tech ecosystem, hardware + services',
    GOOGL: 'Search & cloud, AI integration across products',
    AMZN: 'E-commerce & AWS cloud, logistics scale',
    META: 'Social/messaging platforms, ad-tech leader',
    TSLA: 'EV manufacturer, energy & autonomy plays',
    JPM: 'Largest US bank, diversified financial services',
    BTC: 'Bitcoin, decentralized store of value',
    DBA: 'Agriculture commodity ETF, food price tracker',
    LIT: 'Lithium & battery tech ETF, EV supply chain',
  };
  if (descs[symbol]) return descs[symbol];
  const action = direction === 'long' ? 'benefits from' : 'pressured by';
  return `${action} this macro trend`;
}

// ---------- Confidence Ring (32px, score below) ----------

function ConfidenceRing({ score, size = 32 }) {
  const sw = 3;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score || 0, 0), 100);
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 70 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
      <span style={{ fontSize: '9px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Confidence</span>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        />
      </svg>
      <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{Math.round(clamped)}</span>
    </div>
  );
}

// ---------- Health Ring (96px, for hero) ----------

function HealthRing({ score, size = 96 }) {
  const sw = 6;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score || 0, 0), 100);
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 70 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          />
        </svg>
        <span style={{ position: 'absolute', fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{Math.round(clamped)}</span>
      </div>
      <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Health</span>
    </div>
  );
}

// ---------- Area Chart with Tooltip ----------

function TickerChart({ ticker }) {
  const [tooltip, setTooltip] = useState(null);
  const isLong = ticker.direction === 'long';
  const points = useMemo(() => mockSparkline(ticker.symbol), [ticker.symbol]);
  const vals = points.map(p => p.value);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 200, h = 32;
  const trending = vals[vals.length - 1] > vals[0];
  const color = trending ? '#22c55e' : '#ef4444';
  const fillColor = trending ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)';
  const desc = ticker.rationale || mockTickerDescription(ticker.symbol, ticker.direction);

  const lineD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.value - min) / range) * (h - 4) - 2;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaD = `${lineD} L${w},${h} L0,${h} Z`;

  const handleMouse = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round((x / rect.width) * (points.length - 1));
    const clamped = Math.max(0, Math.min(points.length - 1, idx));
    setTooltip({ x: (clamped / (points.length - 1)) * w, point: points[clamped] });
  }, [points]);

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px', width: '70px', flexShrink: 0,
          fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700,
          color: isLong ? '#22c55e' : '#ef4444',
        }}>
          <span style={{ fontSize: '10px' }}>{isLong ? '▲' : '▼'}</span>
          {ticker.symbol}
        </div>
        <div style={{ position: 'relative', flex: 1, maxWidth: '200px' }}
          onMouseMove={handleMouse}
          onMouseLeave={() => setTooltip(null)}
        >
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            <path d={areaD} fill={fillColor} />
            <path d={lineD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tooltip && (
            <div style={{
              position: 'absolute',
              left: `${(tooltip.x / w) * 100}%`,
              top: '-28px',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.85)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: '#fff',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
            }}>
              {tooltip.point.value.toFixed(1)} · {tooltip.point.date}
            </div>
          )}
        </div>
      </div>
      <div style={{
        fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-sans)',
        marginLeft: '80px', marginTop: '1px', lineHeight: 1.3,
      }}>
        {desc}
      </div>
    </div>
  );
}

// ---------- Conviction Slider ----------

const CONVICTION_LABELS = [
  '', 'Watching 👀', 'Watching 👀', 'Interesting 🤔', 'Interesting 🤔',
  'Building 🔨', 'Building 🔨', 'High Conviction 🔥', 'High Conviction 🔥',
  'Max Bet 🚀', 'Max Bet 🚀',
];

function ConvictionSlider({ value, onChange }) {
  const color = value >= 7 ? '#22c55e' : value >= 4 ? '#f59e0b' : '#ef4444';
  const label = CONVICTION_LABELS[value] || '';
  return (
    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Your Conviction</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>{label}</span>
          <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}/10</span>
        </div>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(parseInt(e.target.value))}
        className="accent-green"
        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
      />
    </div>
  );
}

// ---------- Conviction History (embedded in hero) ----------

function scoreColor(s) {
  if (s >= 7) return '#22c55e';
  if (s >= 4) return '#f59e0b';
  return '#ef4444';
}

function scoreBg(s) {
  if (s >= 7) return 'rgba(34,197,94,0.15)';
  if (s >= 4) return 'rgba(245,158,11,0.15)';
  return 'rgba(239,68,68,0.15)';
}

function ConvictionHistory({ thesisId }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState(5);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(() => {
    getConviction(thesisId).then(r => setEntries(r.data)).catch(() => {});
  }, [thesisId]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addConviction(thesisId, { score: parseInt(score), note });
      setNote('');
      setScore(5);
      setShowForm(false);
      loadEntries();
    } catch { /* ignore */ }
    setSaving(false);
  };

  return (
    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>Conviction History</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '4px 10px', fontSize: '11px',
            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          + Add Entry
        </button>
      </div>

      {/* Timeline */}
      {entries.length > 0 && (
        <div style={{ height: '60px', display: 'flex', alignItems: 'flex-end', gap: '3px', marginBottom: '12px' }}>
          {entries.map((entry) => {
            const pct = Math.max(0, Math.min(100, (entry.score / 10) * 100));
            return (
              <div key={entry.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
                title={`${entry.score}/10 – ${entry.note || ''}`}
              >
                <span style={{ fontSize: '9px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>{entry.score}</span>
                <div style={{
                  width: '100%', borderRadius: '2px 2px 0 0',
                  background: scoreColor(entry.score),
                  height: `${pct}%`, minHeight: '3px',
                }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '8px', padding: '12px', marginBottom: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <label style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Score:</label>
            <input type="range" min="0" max="10" value={score} onChange={e => setScore(e.target.value)} className="accent-green" style={{ flex: 1 }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e', width: '20px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{score}</span>
          </div>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="What changed your conviction?"
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '6px', padding: '8px 10px', fontSize: '12px', color: 'var(--color-text)',
              resize: 'none', height: '60px', fontFamily: 'var(--font-sans)', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" disabled={saving} style={{
              padding: '4px 12px', background: '#22c55e', color: 'var(--color-bg)',
              fontSize: '11px', fontWeight: 600, borderRadius: '6px', border: 'none',
              cursor: 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-sans)',
            }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Log entries */}
      <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[...entries].reverse().map(entry => (
          <div key={entry.id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '8px', padding: '10px',
            display: 'flex', alignItems: 'flex-start', gap: '10px',
          }}>
            <div style={{
              flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-mono)',
              background: scoreBg(entry.score), color: scoreColor(entry.score),
            }}>
              {entry.score}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {entry.note && <p style={{ fontSize: '12px', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', lineHeight: 1.4 }}>{entry.note}</p>}
              <span style={{ fontSize: '10px', color: 'var(--color-dim)', marginTop: '2px', display: 'block', fontFamily: 'var(--font-mono)' }}>
                {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Hero Thesis Card ----------

function HeroCard({ tree, thesis, healthScore, onDelete }) {
  const [deleteHovered, setDeleteHovered] = useState(false);

  const heroTickers = useMemo(() => {
    if (thesis?.top_tickers?.length) {
      return thesis.top_tickers.slice(0, 3).map(sym => ({
        symbol: sym,
        direction: hashStr(sym) % 2 === 0 ? 'long' : 'short',
      }));
    }
    const seen = new Set();
    const tickers = [];
    for (const child of (tree.children || [])) {
      for (const t of (child.tickers || [])) {
        if (!seen.has(t.symbol)) {
          seen.add(t.symbol);
          tickers.push(t);
        }
        if (tickers.length >= 3) break;
      }
      if (tickers.length >= 3) break;
    }
    return tickers;
  }, [tree, thesis]);

  const heroIdeas = useMemo(() => getRootIdeas(tree), [tree]);

  const tags = thesis?.keywords || [];

  return (
    <div style={{
      padding: '28px',
      background: 'linear-gradient(to right, rgba(245,158,11,0.06), transparent)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderLeft: '3px solid #f59e0b',
      borderRadius: '8px',
      marginBottom: '32px',
    }}>
      <div style={{ display: 'flex', gap: '32px' }}>
        {/* Left 60% */}
        <div style={{ flex: '0 0 60%', minWidth: 0 }}>
          {/* Title row with delete button */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-sans)', flex: 1, lineHeight: 1.3 }}>
              {tree.label}
            </h2>
          </div>

          {tree.description && (
            <p style={{ color: 'var(--color-dim)', fontSize: '16px', lineHeight: 1.7, marginBottom: '14px', fontFamily: 'var(--font-sans)' }}>
              {tree.description}
            </p>
          )}

          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {tags.map(k => (
                <span key={k} style={{
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-dim)',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {k}
                </span>
              ))}
            </div>
          )}

          {heroIdeas.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: 'var(--color-purple)', fontSize: '14px' }}>
                <Lightbulb size={14} />
                <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {heroIdeas.map((idea, i) => (
                  <li key={i} style={{ fontSize: '14px', marginBottom: '6px', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
                    <span style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '15px' }}>{idea.name}</span>
                    <span style={{ color: 'var(--color-dim)', fontSize: '14px' }}> — {idea.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right 40% */}
        <div style={{ flex: '0 0 38%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          {/* Delete button top-right */}
          <div style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onDelete}
              onMouseEnter={() => setDeleteHovered(true)}
              onMouseLeave={() => setDeleteHovered(false)}
              style={{
                background: 'transparent',
                border: `1px solid ${deleteHovered ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: '6px',
                padding: '6px',
                color: deleteHovered ? '#ef4444' : 'var(--color-dim)',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              title="Delete thesis"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <HealthRing score={healthScore} />

          {heroTickers.length > 0 && (
            <div style={{ width: '100%' }}>
              {heroTickers.map((t, i) => <TickerChart key={i} ticker={t} />)}
            </div>
          )}
        </div>
      </div>

      {/* Conviction History */}
      {thesis && <ConvictionHistory thesisId={thesis.id} />}
    </div>
  );
}

// ---------- Node Cards ----------

function SecondOrderCard({ node, conviction, onConvictionChange }) {
  const tickers = (node.tickers || []).slice(0, 4);
  const ideas = (node.startup_ideas || []).slice(0, 3);
  const confidence = useMemo(() => mockNodeConfidence(node.label), [node.label]);

  const displayScore = conviction !== 5
    ? Math.round(confidence * 0.5 + conviction * 10 * 0.5)
    : confidence;

  return (
    <div style={{
      padding: '20px',
      background: 'rgba(6,182,212,0.04)',
      border: '1px solid rgba(6,182,212,0.2)',
      borderLeft: '3px solid #06b6d4',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <h3 style={{ color: '#06b6d4', fontSize: '17px', fontWeight: 700, lineHeight: 1.4, fontFamily: 'var(--font-sans)', flex: 1 }}>
          {node.label}
        </h3>
        <ConfidenceRing score={displayScore} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '15px', lineHeight: 1.6, marginBottom: '10px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ marginBottom: ideas.length > 0 ? '12px' : '0' }}>
          {tickers.map((t, i) => <TickerChart key={i} ticker={t} />)}
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: 'var(--color-purple)', fontSize: '14px' }}>
            <Lightbulb size={14} />
            <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ideas.map((idea, i) => (
              <li key={i} style={{ fontSize: '14px', marginBottom: '6px', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '15px' }}>{idea.name}</span>
                {idea.description && (
                  <span style={{ color: 'var(--color-dim)', fontSize: '14px' }}> — {idea.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ConvictionSlider value={conviction} onChange={onConvictionChange} />
    </div>
  );
}

function ThirdOrderCard({ node }) {
  const tickers = (node.tickers || []).slice(0, 4);
  const ideas = (node.startup_ideas || []).slice(0, 3);
  const confidence = useMemo(() => mockNodeConfidence(node.label), [node.label]);

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(168,85,247,0.04)',
      border: '1px solid rgba(168,85,247,0.2)',
      borderLeft: '3px solid #a855f7',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <h3 style={{ color: '#a855f7', fontSize: '15px', fontWeight: 700, lineHeight: 1.4, fontFamily: 'var(--font-sans)', flex: 1 }}>
          {node.label}
        </h3>
        <ConfidenceRing score={confidence} size={28} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ marginBottom: ideas.length > 0 ? '10px' : '0' }}>
          {tickers.map((t, i) => <TickerChart key={i} ticker={t} />)}
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: '#a855f7', fontSize: '13px' }}>
            <Lightbulb size={13} />
            <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ideas.map((idea, i) => (
              <li key={i} style={{ fontSize: '14px', marginBottom: '4px', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '15px' }}>{idea.name}</span>
                {idea.description && (
                  <span style={{ color: 'var(--color-dim)', fontSize: '14px' }}> — {idea.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- Main Tree View ----------

export default function TreeView({ tree, thesis, onDelete }) {
  const secondOrder = tree?.children || [];
  const [convictions, setConvictions] = useState(() => {
    const init = {};
    secondOrder.forEach(so => { init[so.id] = 5; });
    return init;
  });

  const healthScore = useMemo(() => {
    if (secondOrder.length === 0) return 50;
    let total = 0;
    for (const so of secondOrder) {
      total += (convictions[so.id] ?? 5);
    }
    return Math.round((total / secondOrder.length) * 10);
  }, [secondOrder, convictions]);

  if (!tree) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '384px', color: 'var(--color-dim)', fontSize: '14px' }}>
        No tree data available. Generate a tree to see the causal analysis.
      </div>
    );
  }

  return (
    <div>
      <HeroCard tree={tree} thesis={thesis} healthScore={healthScore} onDelete={onDelete} />

      {secondOrder.length > 0 && (
        <>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#06b6d4',
            fontFamily: 'var(--font-sans)',
            marginBottom: '12px',
          }}>
            2nd Order Effects →
          </div>

          <div style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(3, 1fr)',
            overflowX: secondOrder.length > 3 ? 'auto' : 'visible',
          }}>
            {secondOrder.map((so) => {
              const children = so.children || [];
              return (
                <div key={so.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <SecondOrderCard
                    node={so}
                    conviction={convictions[so.id] ?? 5}
                    onConvictionChange={(v) => setConvictions(prev => ({ ...prev, [so.id]: v }))}
                  />

                  {children.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 12px' }}>
                      {/* Connecting line from 2nd-order to 3rd-order */}
                      <div style={{
                        width: '1px',
                        height: '16px',
                        background: 'rgba(255,255,255,0.08)',
                        margin: '0 auto',
                      }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {children.map((to, idx) => (
                          <div key={to.id} style={{ position: 'relative' }}>
                            {idx > 0 && (
                              <div style={{
                                width: '1px',
                                height: '8px',
                                background: 'rgba(255,255,255,0.08)',
                                margin: '0 auto',
                                marginBottom: '0',
                                position: 'absolute',
                                top: '-8px',
                                left: '50%',
                              }} />
                            )}
                            <ThirdOrderCard node={to} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
