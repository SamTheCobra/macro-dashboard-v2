import { useState, useEffect } from 'react';
import { getEvidence } from '../utils/api';
import HealthGauge from './HealthGauge';

export default function EvidenceChart({ thesisId }) {
  const [evidence, setEvidence] = useState(null);

  useEffect(() => {
    getEvidence(thesisId).then(r => setEvidence(r.data)).catch(() => {});
  }, [thesisId]);

  if (!evidence) {
    return <div className="text-sm text-dim">Loading evidence data...</div>;
  }

  const metrics = [
    {
      label: 'Conviction Score',
      value: evidence.conviction_score,
      max: 10,
      color: evidence.conviction_score >= 7 ? 'green' : evidence.conviction_score >= 4 ? 'amber' : 'red',
      description: 'Set manually. Reflects your belief in the thesis.',
    },
    {
      label: 'Evidence Score',
      value: evidence.evidence_score,
      max: 10,
      color: evidence.evidence_score >= 7 ? 'green' : evidence.evidence_score >= 4 ? 'amber' : 'red',
      description: '70% ticker performance + 30% news pulse.',
    },
    {
      label: 'Ticker Performance',
      value: evidence.ticker_performance_score,
      max: 10,
      color: evidence.ticker_performance_score >= 7 ? 'green' : evidence.ticker_performance_score >= 4 ? 'amber' : 'red',
      description: 'Price movement of tickers since activation date.',
    },
    {
      label: 'News Pulse',
      value: evidence.news_pulse_score,
      max: 10,
      color: evidence.news_pulse_score >= 7 ? 'green' : evidence.news_pulse_score >= 4 ? 'amber' : 'red',
      description: 'Ratio of confirming vs contradicting headlines.',
    },
  ];

  return (
    <div>
      {/* Health Score gauge */}
      <div className="bg-card border border-border rounded-xl p-6 mb-4 flex items-center gap-6">
        <HealthGauge score={evidence.health_score} size={100} />
        <div>
          <h3 className="text-lg font-bold text-text">Health Score</h3>
          <p className="text-xs text-dim mt-1">
            (Conviction x 0.4 + Evidence x 0.6) x 10
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: evidence.health_score >= 70 ? 'var(--color-green)' : evidence.health_score >= 40 ? 'var(--color-amber)' : 'var(--color-red)' }}>
            {evidence.health_score.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-dim">{m.label}</span>
              <span className={`text-lg font-bold text-${m.color}`}>{m.value.toFixed(1)}</span>
            </div>
            {/* Bar */}
            <div className="h-2 bg-bg rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full bg-${m.color} transition-all`}
                style={{ width: `${(m.value / m.max) * 100}%` }}
              />
            </div>
            <p className="text-[10px] text-dim mt-2">{m.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
