import { Link } from 'react-router-dom';
import { GitBranch, Calendar, Newspaper } from 'lucide-react';
import HealthGauge from './HealthGauge';

export default function ThesisCard({ thesis }) {
  const pulseColor = (thesis.news_pulse || 5) > 6 ? 'text-green' : (thesis.news_pulse || 5) < 4 ? 'text-red' : 'text-amber';

  return (
    <Link
      to={`/thesis/${thesis.id}`}
      className="block bg-card border border-border rounded-xl p-5 hover:border-green/30 transition-all group no-underline"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text group-hover:text-green transition-colors truncate">
            {thesis.title}
          </h3>
          {thesis.description && (
            <p className="text-xs text-dim mt-1 line-clamp-2">{thesis.description}</p>
          )}
        </div>
        <HealthGauge score={thesis.health_score} size={56} />
      </div>

      <div className="mt-4 flex items-center gap-4 text-xs text-dim">
        <span>
          Conv: <span className="text-text font-medium">{thesis.conviction_score?.toFixed(1) ?? '-'}</span>
        </span>
        <span>
          Evid: <span className="text-text font-medium">{thesis.evidence_score?.toFixed(1) ?? '-'}</span>
        </span>
        <span className={`flex items-center gap-1 ${pulseColor}`}>
          <Newspaper size={11} />
          {thesis.news_pulse?.toFixed(1) ?? '-'}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-dim">
          {thesis.activation_date && (
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {new Date(thesis.activation_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </span>
          )}
          <span className="flex items-center gap-1">
            <GitBranch size={11} />
            {thesis.node_count} nodes
          </span>
        </div>

        {thesis.top_tickers?.length > 0 && (
          <div className="flex gap-1.5">
            {thesis.top_tickers.map(t => (
              <span key={t} className="px-1.5 py-0.5 bg-green/10 text-green text-[10px] rounded font-medium">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
