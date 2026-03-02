import { X, TrendingUp, TrendingDown, Lightbulb } from 'lucide-react';

const typeLabels = {
  thesis: 'Thesis',
  second_order: '2nd Order Effect',
  third_order: '3rd Order Effect',
};

const typeColors = {
  thesis: 'text-green border-green/30',
  second_order: 'text-amber border-amber/30',
  third_order: 'text-purple border-purple/30',
};

export default function NodePanel({ node, onClose }) {
  if (!node) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-5 w-full max-w-md">
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${typeColors[node.nodeType] || 'text-dim'}`}>
            {typeLabels[node.nodeType] || node.nodeType}
          </span>
          <h3 className="text-sm font-semibold text-text mt-1">{node.label}</h3>
        </div>
        <button onClick={onClose} className="text-dim hover:text-text p-1 cursor-pointer bg-transparent border-0">
          <X size={16} />
        </button>
      </div>

      {node.description && (
        <p className="text-xs text-dim mb-4 leading-relaxed">{node.description}</p>
      )}

      {node.tickers?.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-blue mb-2 flex items-center gap-1">
            <TrendingUp size={12} />
            Tickers
          </h4>
          <div className="space-y-2">
            {node.tickers.map((t, i) => (
              <div key={i} className="bg-bg rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-green">{t.symbol}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.direction === 'long' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'}`}>
                    {t.direction === 'long' ? <TrendingUp size={10} className="inline" /> : <TrendingDown size={10} className="inline" />}
                    {' '}{t.direction}
                  </span>
                </div>
                {t.rationale && (
                  <p className="text-[11px] text-dim mt-1">{t.rationale}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {node.startupIdeas?.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-purple mb-2 flex items-center gap-1">
            <Lightbulb size={12} />
            Startup Ideas
          </h4>
          <div className="space-y-2">
            {node.startupIdeas.map((s, i) => (
              <div key={i} className="bg-bg rounded-lg p-3 border border-border">
                <span className="text-xs font-semibold text-text">{s.name}</span>
                {s.description && (
                  <p className="text-[11px] text-dim mt-1">{s.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
