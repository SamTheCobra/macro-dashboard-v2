import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

// Generate deterministic mock sparkline data from ticker symbol
function mockSparkline(symbol) {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) seed += symbol.charCodeAt(i);
  const points = [];
  let val = 50;
  for (let i = 0; i < 12; i++) {
    seed = (seed * 16807 + 7) % 2147483647;
    val += ((seed % 100) - 48) / 10;
    val = Math.max(10, Math.min(90, val));
    points.push(val);
  }
  return points;
}

function Sparkline({ symbol }) {
  const points = useMemo(() => mockSparkline(symbol), [symbol]);
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const w = 30, h = 12;
  const trending = points[points.length - 1] > points[0];
  const color = trending ? '#22c55e' : '#ef4444';

  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }}>
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Mock health score per node from label string
function mockNodeHealth(label) {
  let seed = 0;
  for (let i = 0; i < label.length; i++) seed += label.charCodeAt(i);
  return 40 + (seed % 55); // 40-94 range
}

function HealthDot({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '4px',
      fontFamily: 'var(--font-mono)', fontSize: '10px', color,
    }}>
      <div style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: color, flexShrink: 0,
      }} />
      {score}
    </div>
  );
}

function TickerChip({ ticker }) {
  const isLong = ticker.direction === 'long';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
      fontFamily: 'var(--font-mono)',
      background: '#161b22',
      color: isLong ? '#22c55e' : '#ef4444',
      border: `1px solid ${isLong ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
    }}>
      {isLong ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {ticker.symbol}
      <Sparkline symbol={ticker.symbol} />
    </span>
  );
}

function NodeCard({ node, color, borderColor, bgTint }) {
  const tickers = (node.tickers || []).slice(0, 3);
  const ideas = (node.startup_ideas || []).slice(0, 3);
  const health = useMemo(() => mockNodeHealth(node.label), [node.label]);

  return (
    <div style={{
      padding: '20px',
      background: bgTint,
      border: `1px solid ${borderColor}`,
      borderRadius: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
        <h3 style={{ color, fontSize: '14px', fontWeight: 600, lineHeight: 1.4, fontFamily: 'var(--font-sans)' }}>
          {node.label}
        </h3>
        <HealthDot score={health} />
      </div>

      {node.description && (
        <p style={{ color: 'var(--color-dim)', fontSize: '13px', lineHeight: 1.5, marginBottom: '10px', fontFamily: 'var(--font-sans)' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: ideas.length > 0 ? '12px' : '0' }}>
          {tickers.map((t, i) => (
            <TickerChip key={i} ticker={t} />
          ))}
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', color: 'var(--color-purple)', fontSize: '12px' }}>
            <Lightbulb size={12} />
            <span style={{ fontWeight: 500, fontFamily: 'var(--font-sans)' }}>Startup Ideas</span>
          </div>
          <ul style={{ listStyle: 'disc', paddingLeft: '16px', margin: 0 }}>
            {ideas.map((idea, i) => (
              <li key={i} style={{ color: 'var(--color-dim)', fontSize: '13px', marginBottom: '6px', fontFamily: 'var(--font-sans)' }}>
                <span style={{ color: 'var(--color-text)' }}>{idea.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TreeView({ tree }) {
  if (!tree) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '384px', color: 'var(--color-dim)', fontSize: '14px' }}>
        No tree data available. Generate a tree to see the causal analysis.
      </div>
    );
  }

  const secondOrder = tree.children || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Thesis header card */}
      <div style={{
        padding: '24px',
        background: 'rgba(0,255,136,0.06)',
        border: '1px solid rgba(0,255,136,0.3)',
        borderRadius: '8px',
      }}>
        <div style={{
          fontWeight: 700, color: '#22c55e',
          fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px',
          fontFamily: 'var(--font-sans)',
        }}>
          Thesis
        </div>
        <h2 style={{ color: '#22c55e', fontWeight: 700, fontSize: '18px', lineHeight: 1.3, fontFamily: 'var(--font-sans)' }}>
          {tree.label}
        </h2>
        {tree.description && (
          <p style={{ color: 'var(--color-dim)', marginTop: '8px', fontSize: '14px', lineHeight: 1.5, maxWidth: '72ch', fontFamily: 'var(--font-sans)' }}>
            {tree.description}
          </p>
        )}
      </div>

      {/* 2nd order columns */}
      {secondOrder.length > 0 && (
        <div style={{
          display: 'grid',
          gap: '16px',
          gridTemplateColumns: `repeat(${Math.min(secondOrder.length, 3)}, 1fr)`,
        }}>
          {secondOrder.map((so) => (
            <div key={so.id} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* 2nd order card (amber) */}
              <NodeCard
                node={so}
                color="var(--color-amber)"
                borderColor="rgba(245,158,11,0.3)"
                bgTint="rgba(245,158,11,0.06)"
              />

              {/* 3rd order children (purple), stacked below */}
              {(so.children || []).map((to) => (
                <NodeCard
                  key={to.id}
                  node={to}
                  color="var(--color-purple)"
                  borderColor="rgba(139,92,246,0.3)"
                  bgTint="rgba(139,92,246,0.06)"
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
