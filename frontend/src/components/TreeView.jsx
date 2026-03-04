import { useState, useMemo, useCallback } from 'react';
import { Lightbulb, ChevronDown, ChevronRight } from 'lucide-react';

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

// Generate mock startup ideas for the root thesis
function mockRootIdeas(title) {
  const rand = seededRandom(hashStr(title + '_ideas'));
  const prefixes = ['Track','Pulse','Signal','Scope','Lens','Edge','Wave','Core'];
  const ideas = [];
  for (let i = 0; i < 3; i++) {
    const pIdx = Math.floor(rand() * prefixes.length);
    const word = title.split(' ').find(w => w.length > 3) || 'Macro';
    ideas.push({
      name: `${word}${prefixes[pIdx]}`,
      description: `Analytics dashboard for ${title.toLowerCase()} indicators and signals`,
    });
  }
  return ideas;
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

// ---------- Health Ring (48px, for hero) ----------

function HealthRing({ score, size = 48 }) {
  const sw = 4;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(score || 0, 0), 100);
  const offset = circ - (clamped / 100) * circ;
  const color = clamped >= 70 ? '#22c55e' : clamped >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.06)" strokeWidth={sw} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={sw} fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          />
        </svg>
        <span style={{ position: 'absolute', fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{Math.round(clamped)}</span>
      </div>
      <span style={{ fontSize: '10px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Health</span>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '4px', width: '70px', flexShrink: 0,
        fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600,
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
  );
}

// ---------- Conviction Slider (2nd-order only) ----------

function ConvictionSlider({ value, onChange }) {
  const color = value >= 7 ? '#22c55e' : value >= 4 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Your Conviction</span>
        <span style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>{value}/10</span>
      </div>
      <input type="range" min="1" max="10" value={value} onChange={e => onChange(parseInt(e.target.value))}
        className="accent-green"
        style={{ width: '100%', height: '4px', cursor: 'pointer' }}
      />
    </div>
  );
}

// ---------- Card accent colors ----------

const CARD_ACCENTS = [
  { border: '#f59e0b', bg: 'rgba(245,158,11,0.06)', borderSolid: 'rgba(245,158,11,0.3)' },
  { border: '#3b82f6', bg: 'rgba(59,130,246,0.06)', borderSolid: 'rgba(59,130,246,0.3)' },
  { border: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', borderSolid: 'rgba(139,92,246,0.3)' },
  { border: '#22c55e', bg: 'rgba(34,197,94,0.06)', borderSolid: 'rgba(34,197,94,0.3)' },
  { border: '#ec4899', bg: 'rgba(236,72,153,0.06)', borderSolid: 'rgba(236,72,153,0.3)' },
  { border: '#06b6d4', bg: 'rgba(6,182,212,0.06)', borderSolid: 'rgba(6,182,212,0.3)' },
];

// ---------- Hero Thesis Card ----------

function HeroCard({ tree, thesis, healthScore }) {
  // Use top_tickers from the thesis as mock tickers for the hero
  const heroTickers = useMemo(() => {
    if (thesis?.top_tickers?.length) {
      return thesis.top_tickers.slice(0, 3).map(sym => ({
        symbol: sym,
        direction: hashStr(sym) % 2 === 0 ? 'long' : 'short',
      }));
    }
    // Fallback: collect unique tickers from children
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

  const heroIdeas = useMemo(() => mockRootIdeas(tree.label), [tree.label]);

  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(to right, rgba(245,158,11,0.08), transparent)',
      borderLeft: '3px solid #f59e0b',
      borderRadius: '8px',
      border: '1px solid rgba(245,158,11,0.2)',
      borderLeftWidth: '3px',
      borderLeftColor: '#f59e0b',
      marginBottom: '32px',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--font-sans)', flex: 1, lineHeight: 1.3 }}>
          {tree.label}
        </h2>
        <HealthRing score={healthScore} />
      </div>

      {tree.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px', fontFamily: 'var(--font-sans)', maxWidth: '720px' }}>
          {tree.description}
        </p>
      )}

      {heroTickers.length > 0 && (
        <div style={{ marginBottom: heroIdeas.length > 0 ? '14px' : '0' }}>
          {heroTickers.map((t, i) => <TickerChart key={i} ticker={t} />)}
        </div>
      )}

      {heroIdeas.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: 'var(--color-purple)', fontSize: '12px' }}>
            <Lightbulb size={12} />
            <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {heroIdeas.map((idea, i) => (
              <li key={i} style={{ fontSize: '12px', marginBottom: '6px', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{idea.name}</span>
                <span style={{ color: 'var(--color-dim)' }}> — {idea.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- Node Cards ----------

function SecondOrderCard({ node, accent, conviction, onConvictionChange }) {
  const tickers = (node.tickers || []).slice(0, 4);
  const ideas = (node.startup_ideas || []).slice(0, 3);
  const confidence = useMemo(() => mockNodeConfidence(node.label), [node.label]);

  const displayScore = conviction !== 5
    ? Math.round(confidence * 0.5 + conviction * 10 * 0.5)
    : confidence;

  return (
    <div style={{
      padding: '20px',
      background: accent.bg,
      border: `1px solid ${accent.borderSolid}`,
      borderLeft: `3px solid ${accent.border}`,
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <h3 style={{ color: accent.border, fontSize: '14px', fontWeight: 600, lineHeight: 1.4, fontFamily: 'var(--font-sans)', flex: 1 }}>
          {node.label}
        </h3>
        <ConfidenceRing score={displayScore} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '13px', lineHeight: 1.5, marginBottom: '10px', fontFamily: 'var(--font-sans)' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: 'var(--color-purple)', fontSize: '12px' }}>
            <Lightbulb size={12} />
            <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ideas.map((idea, i) => (
              <li key={i} style={{ fontSize: '12px', marginBottom: '6px', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{idea.name}</span>
                {idea.description && (
                  <span style={{ color: 'var(--color-dim)' }}> — {idea.description}</span>
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

function ThirdOrderCard({ node, parentAccent }) {
  const tickers = (node.tickers || []).slice(0, 4);
  const ideas = (node.startup_ideas || []).slice(0, 3);
  const confidence = useMemo(() => mockNodeConfidence(node.label), [node.label]);

  return (
    <div style={{
      padding: '16px',
      background: 'rgba(139,92,246,0.04)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
        <h3 style={{ color: 'var(--color-purple)', fontSize: '13px', fontWeight: 600, lineHeight: 1.4, fontFamily: 'var(--font-sans)', flex: 1 }}>
          {node.label}
        </h3>
        <ConfidenceRing score={confidence} size={28} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '12px', lineHeight: 1.5, marginBottom: '8px', fontFamily: 'var(--font-sans)' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', color: 'var(--color-purple)', fontSize: '11px' }}>
            <Lightbulb size={11} />
            <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {ideas.map((idea, i) => (
              <li key={i} style={{ fontSize: '12px', marginBottom: '4px', lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
                <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{idea.name}</span>
                {idea.description && (
                  <span style={{ color: 'var(--color-dim)' }}> — {idea.description}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- Collapsible 3rd-order group ----------

function ThirdOrderGroup({ children, parentAccent }) {
  const [expanded, setExpanded] = useState(false);
  if (!children || children.length === 0) return null;

  return (
    <div style={{ marginLeft: '40px', position: 'relative' }}>
      {/* Connecting line */}
      <div style={{
        position: 'absolute',
        left: '-20px',
        top: 0,
        bottom: 0,
        width: '1px',
        background: 'rgba(255,255,255,0.1)',
      }} />

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          color: 'var(--color-dim)',
          fontSize: '11px',
          fontFamily: 'var(--font-sans)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          cursor: 'pointer',
          padding: '6px 0',
          marginBottom: expanded ? '10px' : '0',
        }}
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        3rd Order Effects ({children.length})
      </button>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {children.map((to) => (
            <ThirdOrderCard key={to.id} node={to} parentAccent={parentAccent} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Main Tree View ----------

export default function TreeView({ tree, thesis }) {
  const secondOrder = tree?.children || [];
  const [convictions, setConvictions] = useState(() => {
    const init = {};
    secondOrder.forEach(so => { init[so.id] = 5; });
    return init;
  });

  // Weighted average health from conviction sliders (scaled to 0-100)
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
      {/* Hero thesis card */}
      <HeroCard tree={tree} thesis={thesis} healthScore={healthScore} />

      {/* 2nd Order Effects */}
      {secondOrder.length > 0 && (
        <>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-dim)',
            fontFamily: 'var(--font-sans)',
            marginBottom: '12px',
          }}>
            2nd Order Effects
          </div>

          <div style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: `repeat(${Math.min(secondOrder.length, 3)}, 1fr)`,
          }}>
            {secondOrder.map((so, idx) => {
              const accent = CARD_ACCENTS[idx % CARD_ACCENTS.length];
              return (
                <div key={so.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <SecondOrderCard
                    node={so}
                    accent={accent}
                    conviction={convictions[so.id] ?? 5}
                    onConvictionChange={(v) => setConvictions(prev => ({ ...prev, [so.id]: v }))}
                  />
                  <ThirdOrderGroup children={so.children || []} parentAccent={accent} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
