import { TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

function TickerChip({ ticker }) {
  const isLong = ticker.direction === 'long';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-1 rounded text-[13px] font-semibold"
      style={{
        background: '#161b22',
        color: isLong ? 'var(--color-green)' : 'var(--color-red)',
        border: `1px solid ${isLong ? 'rgba(0,255,136,0.25)' : 'rgba(239,68,68,0.25)'}`,
      }}
    >
      {isLong ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {ticker.symbol}
    </span>
  );
}

function NodeCard({ node, color, borderColor, bgTint }) {
  const tickers = (node.tickers || []).slice(0, 3);
  const ideas = (node.startup_ideas || []).slice(0, 3);

  return (
    <div
      className="p-6"
      style={{
        background: bgTint,
        border: `1px solid ${borderColor}`,
        borderRadius: '8px',
      }}
    >
      <h3
        className="font-semibold mb-3"
        style={{ color, fontSize: '14px', lineHeight: '1.4' }}
      >
        {node.label}
      </h3>

      {node.description && (
        <p className="text-dim mb-3" style={{ fontSize: '13px', lineHeight: '1.5' }}>
          {node.description}
        </p>
      )}

      {tickers.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {tickers.map((t, i) => (
            <TickerChip key={i} ticker={t} />
          ))}
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1.5" style={{ color: 'var(--color-purple)', fontSize: '12px' }}>
            <Lightbulb size={12} />
            <span className="font-medium">Startup Ideas</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5">
            {ideas.map((idea, i) => (
              <li key={i} className="text-dim" style={{ fontSize: '13px' }}>
                <span className="text-text">{idea.name}</span>
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
      <div className="flex items-center justify-center h-96 text-dim" style={{ fontSize: '14px' }}>
        No tree data available. Generate a tree to see the causal analysis.
      </div>
    );
  }

  const secondOrder = tree.children || [];

  return (
    <div className="space-y-6">
      {/* Thesis header card */}
      <div
        className="p-6"
        style={{
          background: 'rgba(0,255,136,0.06)',
          border: '1px solid rgba(0,255,136,0.3)',
          borderRadius: '8px',
        }}
      >
        <div
          className="font-bold text-green"
          style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}
        >
          Thesis
        </div>
        <h2 className="text-green font-bold" style={{ fontSize: '18px', lineHeight: '1.3' }}>
          {tree.label}
        </h2>
        {tree.description && (
          <p className="text-dim mt-2" style={{ fontSize: '14px', lineHeight: '1.5', maxWidth: '72ch' }}>
            {tree.description}
          </p>
        )}
      </div>

      {/* 2nd order columns */}
      {secondOrder.length > 0 && (
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${Math.min(secondOrder.length, 3)}, 1fr)` }}>
          {secondOrder.map((so) => (
            <div key={so.id} className="space-y-4">
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
