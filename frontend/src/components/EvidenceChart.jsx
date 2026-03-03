import { useState, useEffect } from 'react';
import { getEvidence } from '../utils/api';
import HealthGauge from './HealthGauge';

const colorMap = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

export default function EvidenceChart({ thesisId }) {
  const [evidence, setEvidence] = useState(null);

  useEffect(() => {
    getEvidence(thesisId).then(r => setEvidence(r.data)).catch(() => {});
  }, [thesisId]);

  if (!evidence) {
    return <div style={{ fontSize: '13px', color: 'var(--color-dim)' }}>Loading evidence data...</div>;
  }

  const healthColor = evidence.health_score >= 70 ? '#22c55e' : evidence.health_score >= 50 ? '#f59e0b' : '#ef4444';

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
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
      }}>
        <HealthGauge score={evidence.health_score} size={88} />
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>Health Score</h3>
          <p style={{ fontSize: '11px', color: 'var(--color-dim)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
            (Conviction × 0.4 + Evidence × 0.6) × 10
          </p>
          <p style={{ fontSize: '28px', fontWeight: 700, marginTop: '8px', color: healthColor, fontFamily: 'var(--font-mono)' }}>
            {evidence.health_score.toFixed(1)}
          </p>
        </div>
      </div>

      {/* 2x2 Metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>{m.label}</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: colorMap[m.color], fontFamily: 'var(--font-mono)' }}>{m.value.toFixed(1)}</span>
            </div>
            {/* Bar */}
            <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                borderRadius: '3px',
                background: colorMap[m.color],
                width: `${(m.value / m.max) * 100}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--color-dim)', marginTop: '8px', fontFamily: 'var(--font-sans)' }}>{m.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
