import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Lightbulb, Trash2 } from 'lucide-react';
import { getConviction, addConviction, putConviction } from '../utils/api';

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
  if (tree.startup_ideas && tree.startup_ideas.length > 0) {
    return tree.startup_ideas.slice(0, 3);
  }
  const bucket = hashStr(tree.label) % FALLBACK_IDEAS.length;
  return FALLBACK_IDEAS[bucket];
}

// ---------- Ticker full names ----------

const TICKER_NAMES = {
  SPY: 'SPDR S&P 500 ETF', QQQ: 'Invesco QQQ Trust', TLT: 'iShares 20+ Year Treasury Bond ETF',
  GLD: 'SPDR Gold Shares', SLV: 'iShares Silver Trust', UUP: 'Invesco DB US Dollar Index',
  XLF: 'Financial Select Sector SPDR', XLE: 'Energy Select Sector SPDR',
  XLK: 'Technology Select Sector SPDR', XLV: 'Health Care Select Sector SPDR',
  XLP: 'Consumer Staples Select Sector SPDR', XLY: 'Consumer Discretionary Select Sector SPDR',
  XLI: 'Industrial Select Sector SPDR', XLB: 'Materials Select Sector SPDR',
  XLU: 'Utilities Select Sector SPDR', XLRE: 'Real Estate Select Sector SPDR',
  XLC: 'Communication Services Select Sector SPDR',
  IWM: 'iShares Russell 2000 ETF', EEM: 'iShares MSCI Emerging Markets ETF',
  KRE: 'SPDR S&P Regional Banking ETF', ARKK: 'ARK Innovation ETF',
  NVDA: 'NVIDIA Corp', MSFT: 'Microsoft Corp', AAPL: 'Apple Inc',
  GOOGL: 'Alphabet Inc', AMZN: 'Amazon.com Inc', META: 'Meta Platforms Inc',
  TSLA: 'Tesla Inc', JPM: 'JPMorgan Chase & Co', BRK: 'Berkshire Hathaway',
  V: 'Visa Inc', MA: 'Mastercard Inc', JNJ: 'Johnson & Johnson',
  UNH: 'UnitedHealth Group', PG: 'Procter & Gamble', HD: 'Home Depot Inc',
  DIS: 'Walt Disney Co', NFLX: 'Netflix Inc', CRM: 'Salesforce Inc',
  AMD: 'Advanced Micro Devices', INTC: 'Intel Corp', AVGO: 'Broadcom Inc',
  COST: 'Costco Wholesale', WMT: 'Walmart Inc', PEP: 'PepsiCo Inc',
  KO: 'Coca-Cola Co', MCD: "McDonald's Corp", SBUX: 'Starbucks Corp',
  NKE: 'Nike Inc', BA: 'Boeing Co', CAT: 'Caterpillar Inc',
  GS: 'Goldman Sachs', MS: 'Morgan Stanley', C: 'Citigroup Inc',
  BAC: 'Bank of America', WFC: 'Wells Fargo & Co',
  XOM: 'Exxon Mobil Corp', CVX: 'Chevron Corp', COP: 'ConocoPhillips',
  LLY: 'Eli Lilly & Co', PFE: 'Pfizer Inc', ABBV: 'AbbVie Inc',
  MRK: 'Merck & Co', BMY: 'Bristol-Myers Squibb', NVO: 'Novo Nordisk',
  COIN: 'Coinbase Global', SQ: 'Block Inc', PYPL: 'PayPal Holdings',
  SOFI: 'SoFi Technologies', PLTR: 'Palantir Technologies', SNOW: 'Snowflake Inc',
  NET: 'Cloudflare Inc', DDOG: 'Datadog Inc', ZS: 'Zscaler Inc',
  PANW: 'Palo Alto Networks', CRWD: 'CrowdStrike Holdings',
  DBA: 'Invesco DB Agriculture Fund', LIT: 'Global X Lithium & Battery Tech ETF',
  BTC: 'Bitcoin', MSTR: 'MicroStrategy Inc', IBIT: 'iShares Bitcoin Trust',
  SMH: 'VanEck Semiconductor ETF', SOXX: 'iShares Semiconductor ETF',
  TAN: 'Invesco Solar ETF', ICLN: 'iShares Global Clean Energy ETF',
  KWEB: 'KraneShares CSI China Internet ETF', FXI: 'iShares China Large-Cap ETF',
  VNQ: 'Vanguard Real Estate ETF', ITB: 'iShares U.S. Home Construction ETF',
  XHB: 'SPDR S&P Homebuilders ETF', IBB: 'iShares Biotechnology ETF',
  HACK: 'ETFMG Prime Cyber Security ETF', BOTZ: 'Global X Robotics & AI ETF',
};

function getTickerName(symbol) {
  return TICKER_NAMES[symbol] || symbol;
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

// ---------- Sector ETF inference ----------

const SECTOR_KEYWORDS = [
  { keywords: ['food', 'eat', 'meal', 'grocery', 'farm', 'crop', 'agriculture', 'restaurant', 'staple', 'consumer'], etf: { symbol: 'XLP', direction: 'long' } },
  { keywords: ['health', 'pharma', 'drug', 'biotech', 'medical', 'hospital', 'obesity', 'ozempic', 'glp'], etf: { symbol: 'XLV', direction: 'long' } },
  { keywords: ['tech', 'software', 'ai', 'chip', 'semiconductor', 'cloud', 'data', 'compute', 'gpu', 'digital'], etf: { symbol: 'XLK', direction: 'long' } },
  { keywords: ['bank', 'finance', 'rate', 'interest', 'yield', 'credit', 'loan', 'mortgage', 'insurance'], etf: { symbol: 'XLF', direction: 'long' } },
  { keywords: ['energy', 'oil', 'gas', 'solar', 'wind', 'nuclear', 'power', 'utility', 'electric'], etf: { symbol: 'XLE', direction: 'long' } },
  { keywords: ['real estate', 'housing', 'rent', 'property', 'construction', 'home', 'building'], etf: { symbol: 'XLRE', direction: 'long' } },
  { keywords: ['retail', 'shop', 'luxury', 'fashion', 'spend', 'discretionary', 'consumer'], etf: { symbol: 'XLY', direction: 'long' } },
  { keywords: ['industrial', 'manufacture', 'defense', 'aerospace', 'transport', 'infrastructure'], etf: { symbol: 'XLI', direction: 'long' } },
  { keywords: ['material', 'metal', 'mining', 'steel', 'lithium', 'copper', 'commodity'], etf: { symbol: 'XLB', direction: 'long' } },
  { keywords: ['media', 'social', 'stream', 'telecom', 'communication', 'content', 'ad'], etf: { symbol: 'XLC', direction: 'long' } },
];

function inferSectorETF(label, description) {
  const text = `${label} ${description || ''}`.toLowerCase();
  for (const entry of SECTOR_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (text.includes(kw)) return entry.etf;
    }
  }
  return { symbol: 'SPY', direction: 'long' };
}

// ---------- Health Ring with tooltip and pulse ----------

function HealthRing({ score, size = 96, tooltipContent, pulsing }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const sw = size >= 64 ? 6 : 3;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score || 0, 0), 100);
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 70 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#ef4444';
  const labelText = size >= 64 ? 'Health' : 'Confidence';

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size >= 64 ? '4px' : '3px', flexShrink: 0, position: 'relative' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {size >= 64 ? null : (
        <span style={{ fontSize: '9px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>{labelText}</span>
      )}
      <div style={{
        position: 'relative', width: size, height: size,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={size} height={size} style={{
          transform: 'rotate(-90deg)',
          transition: 'filter 0.3s',
          filter: pulsing ? `drop-shadow(0 0 6px ${color})` : 'none',
        }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s, stroke 0.3s' }}
          />
        </svg>
        <span style={{
          position: 'absolute',
          fontSize: size >= 64 ? '24px' : '12px',
          fontWeight: 700, fontFamily: 'var(--font-mono)',
          color, transition: 'color 0.3s',
        }}>{Math.round(clamped)}</span>
      </div>
      {size >= 64 && (
        <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>{labelText}</span>
      )}

      {/* Tooltip */}
      {showTooltip && tooltipContent && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginBottom: '8px',
          background: 'rgba(0,0,0,0.95)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '16px',
          maxWidth: '280px',
          minWidth: '240px',
          zIndex: 100,
          pointerEvents: 'none',
        }}>
          {tooltipContent}
          <div style={{
            position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: '10px', height: '10px', background: 'rgba(0,0,0,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderTop: 'none', borderLeft: 'none',
          }} />
        </div>
      )}
    </div>
  );
}

// ---------- Tooltip content builders ----------

function TooltipRow({ label, value, max }) {
  const color = value >= 7 ? '#22c55e' : value >= 4 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value.toFixed(1)}/{max}</span>
    </div>
  );
}

function ParentTooltip({ conviction, secondOrderAvg, evidenceScore }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', marginBottom: '10px', lineHeight: 1.5 }}>
        Health = (Your conviction x 50%) + (2nd order avg x 35%) + (Evidence x 15%)
      </div>
      <TooltipRow label="Core Conviction" value={conviction} max={10} />
      <TooltipRow label="2nd Order Avg" value={secondOrderAvg} max={10} />
      <TooltipRow label="Evidence Score" value={evidenceScore} max={10} />
    </div>
  );
}

function SecondOrderTooltip({ conviction, thirdOrderAvg }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', marginBottom: '10px', lineHeight: 1.5 }}>
        Confidence = (Your conviction x 70%) + (3rd order avg x 30%)
      </div>
      <TooltipRow label="Your Conviction" value={conviction} max={10} />
      <TooltipRow label="3rd Order Avg" value={thirdOrderAvg} max={10} />
    </div>
  );
}

function ThirdOrderTooltip({ conviction }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)', marginBottom: '10px', lineHeight: 1.5 }}>
        Confidence = Your conviction x 10
      </div>
      <TooltipRow label="Your Conviction" value={conviction} max={10} />
    </div>
  );
}

// ---------- Area Chart with Tooltip ----------

function TickerChart({ ticker, isSector }) {
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
  const fullName = getTickerName(ticker.symbol);

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
          display: 'flex', alignItems: 'center', gap: '4px', minWidth: '70px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '10px', color: isLong ? '#22c55e' : '#ef4444' }}>{isLong ? '\u25B2' : '\u25BC'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: isLong ? '#22c55e' : '#ef4444' }}>
            {ticker.symbol}
          </span>
          {isSector && (
            <span style={{
              fontSize: '9px', fontWeight: 600, fontFamily: 'var(--font-mono)',
              background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)',
              padding: '1px 5px', borderRadius: '3px', marginLeft: '2px',
            }}>SECTOR</span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {fullName}
        </span>
        <div style={{ position: 'relative', flex: 1, maxWidth: '200px', marginLeft: 'auto' }}
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
  '', 'Watching', 'Watching', 'Interesting', 'Interesting',
  'Building', 'Building', 'High Conviction', 'High Conviction',
  'Max Bet', 'Max Bet',
];

function ConvictionSlider({ value, onChange, label = 'Your Conviction', large }) {
  const color = value >= 7 ? '#22c55e' : value >= 4 ? '#f59e0b' : '#ef4444';
  const convLabel = CONVICTION_LABELS[value] || '';
  const emoji = value >= 9 ? ' \uD83D\uDE80' : value >= 7 ? ' \uD83D\uDD25' : value >= 5 ? ' \uD83D\uDD28' : value >= 3 ? ' \uD83E\uDD14' : ' \uD83D\uDC40';
  return (
    <div style={{ marginTop: large ? '18px' : '14px', paddingTop: large ? '16px' : '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: large ? '16px' : '14px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)', fontWeight: large ? 600 : 400 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: large ? '15px' : '14px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>{convLabel}{emoji}</span>
          <span style={{ fontSize: large ? '16px' : '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}/10</span>
        </div>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(parseInt(e.target.value))}
        className="accent-green"
        style={{ width: '100%', height: large ? '6px' : '4px', cursor: 'pointer' }}
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

// ---------- Tickers list with sector ETF ----------

function TickersList({ tickers, label, description }) {
  const sectorETF = useMemo(() => {
    const inferred = inferSectorETF(label || '', description || '');
    const existing = (tickers || []).map(t => t.symbol);
    if (existing.includes(inferred.symbol)) return null;
    return { ...inferred, rationale: mockTickerDescription(inferred.symbol, inferred.direction) };
  }, [tickers, label, description]);

  const displayTickers = (tickers || []).slice(0, 3);

  return (
    <div>
      {displayTickers.map((t, i) => <TickerChart key={i} ticker={t} />)}
      {sectorETF && <TickerChart ticker={sectorETF} isSector />}
    </div>
  );
}

// ---------- Hero Thesis Card ----------

function HeroCard({ tree, thesis, healthScore, parentConviction, onParentConvictionChange, tooltipContent, pulsing, onDelete }) {
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

          {/* Core Conviction slider on hero */}
          <ConvictionSlider value={parentConviction} onChange={onParentConvictionChange} label="Core Conviction" large />

          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '14px', marginBottom: '14px' }}>
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

          <HealthRing score={healthScore} tooltipContent={tooltipContent} pulsing={pulsing} />

          {heroTickers.length > 0 && (
            <div style={{ width: '100%' }}>
              <TickersList tickers={heroTickers} label={tree.label} description={tree.description} />
            </div>
          )}
        </div>
      </div>

      {thesis && <ConvictionHistory thesisId={thesis.id} />}
    </div>
  );
}

// ---------- Node Cards ----------

function SecondOrderCard({ node, conviction, onConvictionChange, healthScore, tooltipContent, pulsing }) {
  const tickers = (node.tickers || []).slice(0, 3);
  const ideas = (node.startup_ideas || []).slice(0, 3);

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
        <HealthRing score={healthScore} size={32} tooltipContent={tooltipContent} pulsing={pulsing} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '15px', lineHeight: 1.6, marginBottom: '10px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ marginBottom: ideas.length > 0 ? '12px' : '0' }}>
          <TickersList tickers={tickers} label={node.label} description={node.description} />
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

function ThirdOrderCard({ node, conviction, onConvictionChange, healthScore, tooltipContent, pulsing }) {
  const tickers = (node.tickers || []).slice(0, 3);
  const ideas = (node.startup_ideas || []).slice(0, 3);

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
        <HealthRing score={healthScore} size={28} tooltipContent={tooltipContent} pulsing={pulsing} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ marginBottom: ideas.length > 0 ? '10px' : '0' }}>
          <TickersList tickers={tickers} label={node.label} description={node.description} />
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

      <ConvictionSlider value={conviction} onChange={onConvictionChange} />
    </div>
  );
}

// ---------- Main Tree View ----------

export default function TreeView({ tree, thesis, onDelete }) {
  const secondOrder = tree?.children || [];

  // --- State: parent conviction ---
  const initialParentConviction = Math.round(thesis?.conviction_score ?? 5);
  const [parentConviction, setParentConviction] = useState(initialParentConviction);

  // --- State: 2nd order convictions (keyed by node id) ---
  const [soConvictions, setSoConvictions] = useState(() => {
    const init = {};
    secondOrder.forEach(so => {
      init[so.id] = Math.round(mockNodeConfidence(so.label) / 10);
    });
    return init;
  });

  // --- State: 3rd order convictions (keyed by node id) ---
  const [toConvictions, setToConvictions] = useState(() => {
    const init = {};
    secondOrder.forEach(so => {
      (so.children || []).forEach(to => {
        init[to.id] = Math.round(mockNodeConfidence(to.label) / 10);
      });
    });
    return init;
  });

  // --- Pulse state ---
  const [pulsingIds, setPulsingIds] = useState(new Set());
  const pulseTimerRef = useRef(null);

  const triggerPulse = useCallback((...ids) => {
    setPulsingIds(new Set(ids));
    clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulsingIds(new Set()), 350);
  }, []);

  useEffect(() => () => clearTimeout(pulseTimerRef.current), []);

  // --- Load latest conviction from API for parent ---
  useEffect(() => {
    if (!thesis?.id) return;
    getConviction(thesis.id).then(r => {
      if (r.data && r.data.length > 0) {
        setParentConviction(r.data[r.data.length - 1].score);
      }
    }).catch(() => {});
  }, [thesis?.id]);

  // --- Persist parent conviction (debounced) ---
  const parentDebounceRef = useRef(null);
  useEffect(() => () => clearTimeout(parentDebounceRef.current), []);

  const handleParentConvictionChange = useCallback((value) => {
    setParentConviction(value);
    triggerPulse('parent');
    if (!thesis?.id) return;
    clearTimeout(parentDebounceRef.current);
    parentDebounceRef.current = setTimeout(() => {
      putConviction(thesis.id, { score: value, note: 'Updated via slider' }).catch(() => {});
    }, 500);
  }, [thesis?.id, triggerPulse]);

  const handleSoConvictionChange = useCallback((nodeId, value) => {
    setSoConvictions(prev => ({ ...prev, [nodeId]: value }));
    triggerPulse(nodeId, 'parent');
  }, [triggerPulse]);

  const handleToConvictionChange = useCallback((toId, soId, value) => {
    setToConvictions(prev => ({ ...prev, [toId]: value }));
    triggerPulse(toId, soId, 'parent');
  }, [triggerPulse]);

  // --- Bottom-up health calculations ---
  const evidenceScore = thesis?.evidence_score ?? 5;

  // 3rd order health: slider * 10
  const toHealthScores = useMemo(() => {
    const map = {};
    secondOrder.forEach(so => {
      (so.children || []).forEach(to => {
        map[to.id] = (toConvictions[to.id] ?? 5) * 10;
      });
    });
    return map;
  }, [secondOrder, toConvictions]);

  // 2nd order health: (own slider * 0.7 + avg children * 0.3) * 10
  const soHealthScores = useMemo(() => {
    const map = {};
    secondOrder.forEach(so => {
      const ownSlider = soConvictions[so.id] ?? 5;
      const children = so.children || [];
      let childAvg = 5;
      if (children.length > 0) {
        const childSliderSum = children.reduce((sum, to) => sum + (toConvictions[to.id] ?? 5), 0);
        childAvg = childSliderSum / children.length;
      }
      map[so.id] = (ownSlider * 0.7 + childAvg * 0.3) * 10;
    });
    return map;
  }, [secondOrder, soConvictions, toConvictions]);

  // Parent health: (own slider * 0.5 + avg 2nd order health/10 * 0.35 + evidence * 0.15) * 10
  const parentHealthScore = useMemo(() => {
    let soAvg = 5;
    if (secondOrder.length > 0) {
      const soSum = secondOrder.reduce((sum, so) => sum + (soHealthScores[so.id] ?? 50), 0);
      soAvg = soSum / secondOrder.length / 10; // convert back to 0-10 scale
    }
    const health = (parentConviction * 0.5 + soAvg * 0.35 + evidenceScore * 0.15) * 10;
    return Math.round(Math.max(0, Math.min(100, health)));
  }, [parentConviction, secondOrder, soHealthScores, evidenceScore]);

  // Avg values for tooltips
  const soAvgFor10 = useMemo(() => {
    if (secondOrder.length === 0) return 5;
    return secondOrder.reduce((s, so) => s + (soHealthScores[so.id] ?? 50), 0) / secondOrder.length / 10;
  }, [secondOrder, soHealthScores]);

  if (!tree) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '384px', color: 'var(--color-dim)', fontSize: '14px' }}>
        No tree data available. Generate a tree to see the causal analysis.
      </div>
    );
  }

  return (
    <div>
      <HeroCard
        tree={tree}
        thesis={thesis}
        healthScore={parentHealthScore}
        parentConviction={parentConviction}
        onParentConvictionChange={handleParentConvictionChange}
        onDelete={onDelete}
        pulsing={pulsingIds.has('parent')}
        tooltipContent={
          <ParentTooltip
            conviction={parentConviction}
            secondOrderAvg={soAvgFor10}
            evidenceScore={evidenceScore}
          />
        }
      />

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
              const soConv = soConvictions[so.id] ?? 5;
              const childSliders = children.map(to => toConvictions[to.id] ?? 5);
              const childAvg = childSliders.length > 0
                ? childSliders.reduce((a, b) => a + b, 0) / childSliders.length
                : 5;

              return (
                <div key={so.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <SecondOrderCard
                    node={so}
                    conviction={soConv}
                    onConvictionChange={(v) => handleSoConvictionChange(so.id, v)}
                    healthScore={Math.round(soHealthScores[so.id] ?? 50)}
                    pulsing={pulsingIds.has(so.id)}
                    tooltipContent={
                      <SecondOrderTooltip conviction={soConv} thirdOrderAvg={childAvg} />
                    }
                  />

                  {children.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', padding: '0 12px' }}>
                      <div style={{
                        width: '1px',
                        height: '16px',
                        background: 'rgba(255,255,255,0.08)',
                        margin: '0 auto',
                      }} />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {children.map((to, idx) => {
                          const toConv = toConvictions[to.id] ?? 5;
                          return (
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
                              <ThirdOrderCard
                                node={to}
                                conviction={toConv}
                                onConvictionChange={(v) => handleToConvictionChange(to.id, so.id, v)}
                                healthScore={Math.round(toHealthScores[to.id] ?? 50)}
                                pulsing={pulsingIds.has(to.id)}
                                tooltipContent={<ThirdOrderTooltip conviction={toConv} />}
                              />
                            </div>
                          );
                        })}
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
