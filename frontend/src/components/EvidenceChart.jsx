import { useState, useEffect, useRef } from 'react';
import { getEvidence } from '../utils/api';
import HealthGauge from './HealthGauge';

const colorMap = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

function EvidenceBreakdownTooltip({ breakdown }) {
  if (!breakdown) return null;
  return (
    <div style={{
      background: 'var(--color-tooltip-bg, #1a1a2e)',
      border: '1px solid var(--color-border)',
      borderRadius: '8px',
      padding: '12px 14px',
      fontSize: '11px',
      fontFamily: 'var(--font-sans)',
      color: 'var(--color-text)',
      minWidth: '220px',
      maxWidth: '300px',
    }}>
      <div style={{ fontWeight: 700, marginBottom: '8px', fontSize: '12px' }}>Evidence Score Breakdown</div>
      {breakdown.keywords_queried?.length > 0 && (
        <div style={{ marginBottom: '6px' }}>
          <span style={{ color: 'var(--color-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Keywords searched</span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '3px' }}>
            {breakdown.keywords_queried.map(kw => (
              <span key={kw} style={{ padding: '1px 6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}>{kw}</span>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
        <div>
          <span style={{ color: 'var(--color-dim)', fontSize: '10px' }}>Trend Momentum</span>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{breakdown.trend_momentum}/10</div>
        </div>
        <div>
          <span style={{ color: 'var(--color-dim)', fontSize: '10px' }}>Keyword Breadth</span>
          <div style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{breakdown.keyword_breadth}/10</div>
        </div>
      </div>
      {breakdown.recent_headlines?.length > 0 && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '6px', marginTop: '4px' }}>
          <span style={{ color: 'var(--color-dim)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Headlines</span>
          {breakdown.recent_headlines.map((h, i) => (
            <div key={i} style={{ marginTop: '4px', fontSize: '10px', lineHeight: 1.3 }}>
              <span style={{
                display: 'inline-block',
                width: '6px', height: '6px', borderRadius: '50%', marginRight: '5px',
                background: h.classification === 'confirming' ? '#22c55e' : h.classification === 'contradicting' ? '#ef4444' : '#888',
              }} />
              {h.title}
              {h.source && <span style={{ color: 'var(--color-dim)', marginLeft: '4px' }}>— {h.source}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function EvidenceChart({ thesisId }) {
  const [evidence, setEvidence] = useState(null);

  useEffect(() => {
    getEvidence(thesisId).then(r => setEvidence(r.data)).catch(() => {});
  }, [thesisId]);

  if (!evidence) {
    return <div style={{ fontSize: '13px', color: 'var(--color-dim)' }}>Loading evidence data...</div>;
  }

  const healthColor = evidence.health_score >= 70 ? '#22c55e' : evidence.health_score >= 50 ? '#f59e0b' : '#ef4444';

  const [hoveredMetric, setHoveredMetric] = useState(null);

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
      hasTooltip: true,
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
            position: 'relative',
            cursor: m.hasTooltip ? 'help' : 'default',
          }}
            onMouseEnter={() => m.hasTooltip && setHoveredMetric(m.label)}
            onMouseLeave={() => m.hasTooltip && setHoveredMetric(null)}
          >
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
            {m.hasTooltip && hoveredMetric === m.label && evidence.evidence_breakdown && (
              <div style={{ position: 'absolute', bottom: '100%', left: '0', marginBottom: '8px', zIndex: 50 }}>
                <EvidenceBreakdownTooltip breakdown={evidence.evidence_breakdown} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
