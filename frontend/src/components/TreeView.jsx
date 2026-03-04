import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { getConviction, putConviction, getThesis } from '../utils/api';

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

// ---------- Ticker full names (~200 entries) ----------

const TICKER_NAMES = {
  // Major indices & broad ETFs
  SPY: 'SPDR S&P 500 ETF', QQQ: 'Invesco QQQ Trust', DIA: 'SPDR Dow Jones Industrial Avg',
  IWM: 'iShares Russell 2000 ETF', IWF: 'iShares Russell 1000 Growth', IWD: 'iShares Russell 1000 Value',
  VTI: 'Vanguard Total Stock Market', VOO: 'Vanguard S&P 500 ETF', VEA: 'Vanguard FTSE Developed Markets',
  VWO: 'Vanguard FTSE Emerging Markets', EEM: 'iShares MSCI Emerging Markets ETF', EFA: 'iShares MSCI EAFE ETF',
  // Sector ETFs
  XLF: 'Financial Select Sector SPDR', XLE: 'Energy Select Sector SPDR',
  XLK: 'Technology Select Sector SPDR', XLV: 'Health Care Select Sector SPDR',
  XLP: 'Consumer Staples Select Sector SPDR', XLY: 'Consumer Discretionary Select Sector SPDR',
  XLI: 'Industrial Select Sector SPDR', XLB: 'Materials Select Sector SPDR',
  XLU: 'Utilities Select Sector SPDR', XLRE: 'Real Estate Select Sector SPDR',
  XLC: 'Communication Services Select Sector SPDR',
  // Fixed income & commodities
  TLT: 'iShares 20+ Year Treasury Bond ETF', TBF: 'ProShares Short 20+ Year Treasury',
  SHY: 'iShares 1-3 Year Treasury Bond', IEF: 'iShares 7-10 Year Treasury Bond',
  HYG: 'iShares iBoxx High Yield Corporate Bond', LQD: 'iShares iBoxx Investment Grade Corporate Bond',
  GLD: 'SPDR Gold Shares', SLV: 'iShares Silver Trust', UUP: 'Invesco DB US Dollar Index',
  DBA: 'Invesco DB Agriculture Fund', USO: 'United States Oil Fund',
  // Thematic ETFs
  ARKK: 'ARK Innovation ETF', ARKG: 'ARK Genomic Revolution ETF',
  KRE: 'SPDR S&P Regional Banking ETF', SMH: 'VanEck Semiconductor ETF',
  SOXX: 'iShares Semiconductor ETF', TAN: 'Invesco Solar ETF',
  ICLN: 'iShares Global Clean Energy ETF', LIT: 'Global X Lithium & Battery Tech ETF',
  KWEB: 'KraneShares CSI China Internet ETF', FXI: 'iShares China Large-Cap ETF',
  VNQ: 'Vanguard Real Estate ETF', ITB: 'iShares U.S. Home Construction ETF',
  XHB: 'SPDR S&P Homebuilders ETF', IBB: 'iShares Biotechnology ETF',
  HACK: 'ETFMG Prime Cyber Security ETF', BOTZ: 'Global X Robotics & AI ETF',
  GDX: 'VanEck Gold Miners ETF', COPX: 'Global X Copper Miners ETF',
  WFH: 'Direxion Work From Home ETF', IBIT: 'iShares Bitcoin Trust',
  // Mega-cap tech
  NVDA: 'NVIDIA Corp', MSFT: 'Microsoft Corp', AAPL: 'Apple Inc',
  GOOGL: 'Alphabet Inc', GOOG: 'Alphabet Inc (Class C)', AMZN: 'Amazon.com Inc',
  META: 'Meta Platforms Inc', TSLA: 'Tesla Inc', AVGO: 'Broadcom Inc',
  // Semiconductors
  AMD: 'Advanced Micro Devices', INTC: 'Intel Corp', QCOM: 'Qualcomm Inc',
  TXN: 'Texas Instruments', MU: 'Micron Technology', AMAT: 'Applied Materials',
  LRCX: 'Lam Research', KLAC: 'KLA Corp', MRVL: 'Marvell Technology',
  // Software & cloud
  CRM: 'Salesforce Inc', NOW: 'ServiceNow Inc', SNOW: 'Snowflake Inc',
  NET: 'Cloudflare Inc', DDOG: 'Datadog Inc', ZS: 'Zscaler Inc',
  PANW: 'Palo Alto Networks', CRWD: 'CrowdStrike Holdings', OKTA: 'Okta Inc',
  PLTR: 'Palantir Technologies', TWLO: 'Twilio Inc', TTD: 'The Trade Desk',
  PUBM: 'PubMatic Inc', DUOL: 'Duolingo Inc',
  // Fintech & payments
  V: 'Visa Inc', MA: 'Mastercard Inc', PYPL: 'PayPal Holdings',
  SQ: 'Block Inc', COIN: 'Coinbase Global', SOFI: 'SoFi Technologies',
  // Banks & financials
  JPM: 'JPMorgan Chase & Co', BAC: 'Bank of America', WFC: 'Wells Fargo & Co',
  GS: 'Goldman Sachs', MS: 'Morgan Stanley', C: 'Citigroup Inc',
  BRK: 'Berkshire Hathaway', PGR: 'Progressive Corp',
  // Healthcare & pharma
  JNJ: 'Johnson & Johnson', UNH: 'UnitedHealth Group', LLY: 'Eli Lilly & Co',
  PFE: 'Pfizer Inc', ABBV: 'AbbVie Inc', MRK: 'Merck & Co',
  BMY: 'Bristol-Myers Squibb', NVO: 'Novo Nordisk', AMGN: 'Amgen Inc',
  GILD: 'Gilead Sciences', BIIB: 'Biogen Inc', ISRG: 'Intuitive Surgical',
  SYK: 'Stryker Corp', IDXX: 'IDEXX Laboratories', HIMS: 'Hims & Hers Health',
  TDOC: 'Teladoc Health', AMWL: 'Amwell', USPH: 'US Physical Therapy',
  TRUP: 'Trupanion Inc',
  // Consumer
  PG: 'Procter & Gamble', KO: 'Coca-Cola Co', PEP: 'PepsiCo Inc',
  COST: 'Costco Wholesale', WMT: 'Walmart Inc', HD: 'Home Depot Inc',
  LOW: "Lowe's Companies", MCD: "McDonald's Corp", SBUX: 'Starbucks Corp',
  NKE: 'Nike Inc', DIS: 'Walt Disney Co', NFLX: 'Netflix Inc',
  SPOT: 'Spotify Technology', DG: 'Dollar General', BJ: "BJ's Wholesale Club",
  EL: 'Estee Lauder Companies', CPRI: 'Capri Holdings', LVMUY: 'LVMH',
  DECK: 'Deckers Outdoor', YETI: 'YETI Holdings', WSM: 'Williams-Sonoma',
  ETSY: 'Etsy Inc', CHWY: 'Chewy Inc',
  // E-commerce & delivery
  DASH: 'DoorDash Inc', CART: 'Instacart (Maplebear)', TOST: 'Toast Inc',
  // Industrials & defense
  BA: 'Boeing Co', CAT: 'Caterpillar Inc', DE: 'Deere & Company',
  HON: 'Honeywell International', UNP: 'Union Pacific', UPS: 'United Parcel Service',
  RTX: 'RTX Corp (Raytheon)', LMT: 'Lockheed Martin', GE: 'GE Aerospace',
  // Energy
  XOM: 'Exxon Mobil Corp', CVX: 'Chevron Corp', COP: 'ConocoPhillips',
  EOG: 'EOG Resources', SLB: 'Schlumberger', VST: 'Vistra Corp',
  SMR: 'NuScale Power', FSLR: 'First Solar Inc',
  // Real estate & REITs
  AMT: 'American Tower Corp', PLD: 'Prologis Inc', O: 'Realty Income Corp',
  EQR: 'Equity Residential', VNO: 'Vornado Realty Trust', EXR: 'Extra Space Storage',
  VTR: 'Ventas Inc', WELL: 'Welltower Inc', UMH: 'UMH Properties',
  AMH: 'American Homes 4 Rent', DHI: 'D.R. Horton', LEN: 'Lennar Corp',
  // Telecom & media
  T: 'AT&T Inc', VZ: 'Verizon Communications', TMUS: 'T-Mobile US',
  CMCSA: 'Comcast Corp', MSGS: 'Madison Square Garden Sports',
  // Internet & social
  SNAP: 'Snap Inc', PINS: 'Pinterest Inc', RBLX: 'Roblox Corp',
  ZM: 'Zoom Video Communications', MTCH: 'Match Group', UPWK: 'Upwork Inc',
  DKNG: 'DraftKings Inc', PTON: 'Peloton Interactive',
  // Autos & EV
  F: 'Ford Motor Co', GM: 'General Motors', RIVN: 'Rivian Automotive',
  LCID: 'Lucid Group',
  // Utilities & water
  NEE: 'NextEra Energy', DUK: 'Duke Energy', SO: 'Southern Company',
  AWK: 'American Water Works', XYL: 'Xylem Inc',
  // Materials & packaging
  AMCR: 'Amcor PLC', FCX: 'Freeport-McMoRan',
  // Specialty
  BTC: 'Bitcoin', MSTR: 'MicroStrategy Inc', GRMN: 'Garmin Ltd',
  MLKN: 'MillerKnoll Inc', TPX: 'Tempur Sealy International',
  BKD: 'Brookdale Senior Living', COUR: 'Coursera Inc', EAR: 'Eargo Inc',
};

function getTickerName(symbol) {
  return TICKER_NAMES[symbol] || null;
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
  const ringRef = useRef(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const sw = size >= 64 ? 5 : 2.5;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score || 0, 0), 100);
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 70 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#ef4444';

  const handleMouseEnter = () => {
    if (ringRef.current) {
      const rect = ringRef.current.getBoundingClientRect();
      setTooltipPos({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    }
    setShowTooltip(true);
  };

  return (
    <div
      ref={ringRef}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div style={{
        position: 'relative', width: size, height: size,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={size} height={size} style={{
          transform: 'rotate(-90deg)',
          transition: 'filter 0.3s',
          filter: pulsing ? `drop-shadow(0 0 6px ${color})` : 'none',
        }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-ring-track)" strokeWidth={sw} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.3s, stroke 0.3s' }}
          />
        </svg>
        <span style={{
          position: 'absolute',
          fontSize: size >= 64 ? '22px' : '11px',
          fontWeight: 700, fontFamily: 'var(--font-mono)',
          color, transition: 'color 0.3s',
        }}>{Math.round(clamped)}</span>
      </div>
      {size >= 64 && (
        <span style={{ fontSize: '10px', color: 'var(--color-faint)', fontFamily: 'var(--font-sans)', letterSpacing: '0.04em' }}>Health</span>
      )}

      {showTooltip && tooltipContent && (
        <div style={{
          position: 'fixed',
          top: tooltipPos.top - 8,
          left: tooltipPos.left,
          transform: 'translate(-50%, -100%)',
          background: 'var(--color-tooltip-bg)',
          border: '1px solid var(--color-tooltip-border)',
          borderRadius: '12px',
          padding: '16px',
          maxWidth: '280px',
          minWidth: '240px',
          zIndex: 9999,
          pointerEvents: 'none',
        }}>
          {tooltipContent}
          <div style={{
            position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
            width: '10px', height: '10px', background: 'var(--color-tooltip-bg)',
            border: '1px solid var(--color-tooltip-border)',
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
      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value.toFixed(1)}/{max}</span>
    </div>
  );
}

function ParentTooltip({ conviction, evidenceScore }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', marginBottom: '10px', lineHeight: 1.5 }}>
        Health = (Conviction x 40%) + (Evidence x 60%) &times; 10
      </div>
      <TooltipRow label="Conviction" value={conviction} max={10} />
      <TooltipRow label="Evidence" value={evidenceScore} max={10} />
    </div>
  );
}

function SecondOrderTooltip({ conviction, thirdOrderAvg }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', marginBottom: '10px', lineHeight: 1.5 }}>
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
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)', marginBottom: '10px', lineHeight: 1.5 }}>
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
  const w = 180, h = 24;
  const trending = vals[vals.length - 1] > vals[0];
  const color = trending ? 'var(--color-chart-up)' : 'var(--color-chart-down)';
  const fillColor = trending ? 'var(--color-chart-up-fill)' : 'var(--color-chart-down-fill)';
  const desc = ticker.rationale || mockTickerDescription(ticker.symbol, ticker.direction);
  const fullName = getTickerName(ticker.symbol);
  const accentColor = isLong ? 'var(--color-chart-up)' : 'var(--color-chart-down)';

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

  const rowOpacity = isSector ? 0.4 : 1;

  return (
    <div style={{ opacity: rowOpacity }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'baseline', gap: '0', overflow: 'hidden' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 700, color: accentColor, flexShrink: 0 }}>
            {ticker.symbol}
          </span>
          {fullName && (
            <span style={{ fontSize: '14px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)', marginLeft: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              · {fullName}
            </span>
          )}
        </div>
        <div style={{ position: 'relative', width: '180px', maxWidth: '100%', flexShrink: 0 }}
          onMouseMove={handleMouse}
          onMouseLeave={() => setTooltip(null)}
        >
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: 'block', borderRadius: '4px', maxWidth: '100%' }}>
            <path d={areaD} fill={fillColor} />
            <path d={lineD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tooltip && (
            <div style={{
              position: 'absolute',
              left: `${(tooltip.x / w) * 100}%`,
              top: '-24px',
              transform: 'translateX(-50%)',
              background: 'var(--color-tooltip-bg)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-text)',
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
        fontSize: '12px', color: 'var(--color-faint)', fontFamily: 'var(--font-sans)',
        marginTop: '2px', lineHeight: 1.3,
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
  const [showLabel, setShowLabel] = useState(false);
  const fadeRef = useRef(null);

  const startDrag = useCallback(() => {
    clearTimeout(fadeRef.current);
    setShowLabel(true);
  }, []);

  const endDrag = useCallback(() => {
    clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => setShowLabel(false), 1000);
  }, []);

  useEffect(() => () => clearTimeout(fadeRef.current), []);

  return (
    <div style={{ paddingTop: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{
          fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em',
          color: 'var(--color-faint)', fontFamily: 'var(--font-sans)', fontWeight: large ? 600 : 500,
        }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '13px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)',
            opacity: showLabel ? 1 : 0, transition: 'opacity 0.3s',
          }}>{convLabel}</span>
          <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: showLabel ? color : 'var(--color-faint)' }}>{value}/10</span>
        </div>
      </div>
      <input type="range" min="1" max="10" value={value}
        onChange={e => onChange(parseInt(e.target.value))}
        onMouseDown={startDrag} onMouseUp={endDrag}
        onTouchStart={startDrag} onTouchEnd={endDrag}
        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
      />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {displayTickers.map((t, i) => <TickerChart key={i} ticker={t} />)}
      {sectorETF && <TickerChart ticker={sectorETF} isSector />}
    </div>
  );
}

// ---------- Startup Ideas list ----------

function IdeasList({ ideas }) {
  if (!ideas || ideas.length === 0) return null;
  return (
    <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {ideas.map((idea, i) => (
          <div key={i}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>{idea.name}</span>
            {idea.description && (
              <span style={{ fontSize: '13px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}> — {idea.description}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------- Sticky Hero Bar ----------

function StickyHeroBar({ visible, title, healthScore, conviction, tickers }) {
  const color = healthScore >= 70 ? '#22c55e' : healthScore >= 50 ? '#f59e0b' : '#ef4444';
  const convColor = conviction >= 7 ? '#22c55e' : conviction >= 4 ? '#f59e0b' : '#ef4444';
  const tickerSymbols = (tickers || []).slice(0, 3);

  return (
    <div style={{
      position: 'fixed',
      top: '52px',
      left: 0,
      right: 0,
      zIndex: 40,
      height: '48px',
      background: 'var(--color-header-bg)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'auto' : 'none',
      transition: 'opacity 0.2s',
    }}>
      {/* Left: title */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          maxWidth: '400px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
          textAlign: 'left',
        }}
        title={title}
      >
        {title}
      </button>

      {/* Center: mini health ring + score */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <svg width={24} height={24} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle cx={12} cy={12} r={9} stroke="var(--color-ring-track)" strokeWidth={2.5} fill="none" />
          <circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2.5} fill="none"
            strokeDasharray={2 * Math.PI * 9}
            strokeDashoffset={2 * Math.PI * 9 - (Math.min(Math.max(healthScore, 0), 100) / 100) * 2 * Math.PI * 9}
            strokeLinecap="round"
          />
        </svg>
        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
          {Math.round(healthScore)}
        </span>
      </div>

      {/* Right: conviction + ticker badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: 'var(--color-dim)' }}>
          Conv: <span style={{ fontWeight: 700, color: convColor }}>{conviction}/10</span>
        </span>
        {tickerSymbols.length > 0 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {tickerSymbols.map(t => (
              <span key={t.symbol} style={{
                padding: '2px 6px',
                background: 'var(--color-ticker-badge-bg)',
                color: 'var(--color-accent-green)',
                fontSize: '11px',
                fontWeight: 700,
                borderRadius: '3px',
                fontFamily: 'var(--font-mono)',
              }}>
                {t.symbol}
              </span>
            ))}
          </div>
        )}
      </div>
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
      background: 'var(--color-card)',
      borderLeft: '3px solid var(--color-accent-amber)',
      borderRadius: '8px',
      boxShadow: '0 1px 3px var(--color-shadow)',
      marginBottom: '32px',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: '32px' }}>
        {/* Left */}
        <div style={{ flex: '0 0 60%', minWidth: 0, borderRight: '1px solid var(--color-border)', paddingRight: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-accent-amber)', fontFamily: 'var(--font-sans)', flex: 1, lineHeight: 1.3 }}>
              {tree.label}
            </h2>
          </div>

          {tree.description && (
            <p style={{ color: 'var(--color-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px', fontFamily: 'var(--font-sans)' }}>
              {tree.description}
            </p>
          )}

          <ConvictionSlider value={parentConviction} onChange={onParentConvictionChange} label="Core Conviction" large />

          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
              {tags.map(k => (
                <span key={k} style={{
                  padding: '2px 8px',
                  background: 'var(--color-tag-bg)',
                  color: 'var(--color-tag-text)',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {k}
                </span>
              ))}
            </div>
          )}

          {heroIdeas.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <IdeasList ideas={heroIdeas} />
            </div>
          )}
        </div>

        {/* Right */}
        <div style={{ flex: '0 0 38%', maxWidth: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={onDelete}
              onMouseEnter={() => setDeleteHovered(true)}
              onMouseLeave={() => setDeleteHovered(false)}
              style={{
                background: 'transparent',
                border: `1px solid ${deleteHovered ? 'var(--color-delete-hover-border)' : 'var(--color-delete-border)'}`,
                borderRadius: '6px',
                padding: '6px',
                color: deleteHovered ? '#ef4444' : 'var(--color-delete-text)',
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
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <TickersList tickers={heroTickers} label={tree.label} description={tree.description} />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

// ---------- Node Cards ----------

function SecondOrderCard({ node, conviction, onConvictionChange, healthScore, tooltipContent, pulsing }) {
  const tickers = (node.tickers || []).slice(0, 3);
  const ideas = (node.startup_ideas || []).slice(0, 3);

  return (
    <div style={{
      padding: '28px',
      background: 'var(--color-card)',
      borderLeft: '3px solid var(--color-accent-cyan)',
      borderRadius: '8px',
      boxShadow: '0 1px 3px var(--color-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <h3 style={{ color: 'var(--color-accent-cyan)', fontSize: '16px', fontWeight: 600, lineHeight: 1.4, fontFamily: 'var(--font-sans)', flex: 1 }}>
          {node.label}
        </h3>
        <HealthRing score={healthScore} size={28} tooltipContent={tooltipContent} pulsing={pulsing} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ marginBottom: ideas.length > 0 ? '24px' : '20px' }}>
          <TickersList tickers={tickers} label={node.label} description={node.description} />
        </div>
      )}

      {ideas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <IdeasList ideas={ideas} />
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
      padding: '28px',
      background: 'var(--color-card)',
      borderLeft: '3px solid var(--color-accent-purple)',
      borderRadius: '8px',
      boxShadow: '0 1px 3px var(--color-shadow)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <h3 style={{ color: 'var(--color-accent-purple)', fontSize: '14px', fontWeight: 600, lineHeight: 1.4, fontFamily: 'var(--font-sans)', flex: 1 }}>
          {node.label}
        </h3>
        <HealthRing score={healthScore} size={28} tooltipContent={tooltipContent} pulsing={pulsing} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-secondary)', fontSize: '14px', lineHeight: 1.5, marginBottom: '20px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ marginBottom: ideas.length > 0 ? '24px' : '20px' }}>
          <TickersList tickers={tickers} label={node.label} description={node.description} />
        </div>
      )}

      {ideas.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <IdeasList ideas={ideas} />
        </div>
      )}

      <ConvictionSlider value={conviction} onChange={onConvictionChange} />
    </div>
  );
}

// ---------- Main Tree View ----------

export default function TreeView({ tree, thesis, onDelete }) {
  const secondOrder = tree?.children || [];

  // Health score: backend is source of truth
  const [healthScore, setHealthScore] = useState(thesis?.health_score ?? 50);

  const initialParentConviction = Math.round(thesis?.conviction_score ?? 5);
  const [parentConviction, setParentConviction] = useState(initialParentConviction);

  const [soConvictions, setSoConvictions] = useState(() => {
    const init = {};
    secondOrder.forEach(so => {
      init[so.id] = Math.round(mockNodeConfidence(so.label) / 10);
    });
    return init;
  });

  const [toConvictions, setToConvictions] = useState(() => {
    const init = {};
    secondOrder.forEach(so => {
      (so.children || []).forEach(to => {
        init[to.id] = Math.round(mockNodeConfidence(to.label) / 10);
      });
    });
    return init;
  });

  const [pulsingIds, setPulsingIds] = useState(new Set());
  const pulseTimerRef = useRef(null);

  const triggerPulse = useCallback((...ids) => {
    setPulsingIds(new Set(ids));
    clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => setPulsingIds(new Set()), 350);
  }, []);

  useEffect(() => () => clearTimeout(pulseTimerRef.current), []);

  useEffect(() => {
    if (!thesis?.id) return;
    getConviction(thesis.id).then(r => {
      if (r.data && r.data.length > 0) {
        setParentConviction(r.data[r.data.length - 1].score);
      }
    }).catch(() => {});
  }, [thesis?.id]);

  // Re-fetch health from backend after conviction changes
  const refreshHealthRef = useRef(null);
  const refreshHealth = useCallback(() => {
    if (!thesis?.id) return;
    getThesis(thesis.id).then(r => {
      if (r.data?.health_score != null) {
        setHealthScore(r.data.health_score);
      }
    }).catch(() => {});
  }, [thesis?.id]);

  const parentDebounceRef = useRef(null);
  useEffect(() => {
    return () => {
      clearTimeout(parentDebounceRef.current);
      clearTimeout(refreshHealthRef.current);
    };
  }, []);

  const handleParentConvictionChange = useCallback((value) => {
    setParentConviction(value);
    triggerPulse('parent');
    if (!thesis?.id) return;
    clearTimeout(parentDebounceRef.current);
    parentDebounceRef.current = setTimeout(() => {
      putConviction(thesis.id, { score: value, note: 'Updated via slider' })
        .then(() => {
          // Re-fetch thesis to get backend-computed health_score
          clearTimeout(refreshHealthRef.current);
          refreshHealthRef.current = setTimeout(refreshHealth, 200);
        })
        .catch(() => {});
    }, 500);
  }, [thesis?.id, triggerPulse, refreshHealth]);

  const handleSoConvictionChange = useCallback((nodeId, value) => {
    setSoConvictions(prev => ({ ...prev, [nodeId]: value }));
    triggerPulse(nodeId, 'parent');
  }, [triggerPulse]);

  const handleToConvictionChange = useCallback((toId, soId, value) => {
    setToConvictions(prev => ({ ...prev, [toId]: value }));
    triggerPulse(toId, soId, 'parent');
  }, [triggerPulse]);

  // Sub-card health scores (local display only, not stored in backend)
  const toHealthScores = useMemo(() => {
    const map = {};
    secondOrder.forEach(so => {
      (so.children || []).forEach(to => {
        map[to.id] = (toConvictions[to.id] ?? 5) * 10;
      });
    });
    return map;
  }, [secondOrder, toConvictions]);

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

  // Sticky bar: IntersectionObserver on hero card
  const heroRef = useRef(null);
  const [heroVisible, setHeroVisible] = useState(true);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tree]);

  // Compute hero tickers at TreeView level for the sticky bar
  const heroTickers = useMemo(() => {
    if (!tree) return [];
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

  if (!tree) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '384px', color: 'var(--color-faint)', fontSize: '14px' }}>
        No tree data available. Generate a tree to see the causal analysis.
      </div>
    );
  }

  return (
    <div>
      <StickyHeroBar
        visible={!heroVisible}
        title={tree.label}
        healthScore={healthScore}
        conviction={parentConviction}
        tickers={heroTickers}
      />

      <div ref={heroRef}>
        <HeroCard
          tree={tree}
          thesis={thesis}
          healthScore={healthScore}
          parentConviction={parentConviction}
          onParentConvictionChange={handleParentConvictionChange}
          onDelete={onDelete}
          pulsing={pulsingIds.has('parent')}
          tooltipContent={
            <ParentTooltip
              conviction={parentConviction}
              evidenceScore={thesis?.evidence_score ?? 5}
            />
          }
        />
      </div>

      {secondOrder.length > 0 && (
        <>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-accent-cyan)',
            opacity: 0.6,
            fontFamily: 'var(--font-sans)',
            marginBottom: '12px',
          }}>
            2nd Order Effects
          </div>

          <div style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          }}>
            {secondOrder.map((so) => {
              const children = so.children || [];
              const soConv = soConvictions[so.id] ?? 5;
              const childSliders = children.map(to => toConvictions[to.id] ?? 5);
              const childAvg = childSliders.length > 0
                ? childSliders.reduce((a, b) => a + b, 0) / childSliders.length
                : 5;

              return (
                <div key={so.id} style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
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
                        background: 'var(--color-connector)',
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
                                  background: 'var(--color-connector)',
                                  margin: '0 auto',
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
