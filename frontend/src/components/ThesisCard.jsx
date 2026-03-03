import { useState } from 'react';
import { Link } from 'react-router-dom';
import HealthGauge from './HealthGauge';

export default function ThesisCard({ thesis }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={`/thesis/${thesis.id}`}
      style={{
        display: 'block',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '12px',
        padding: '24px',
        textDecoration: 'none',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Title + HealthRing */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <h3 style={{
          fontSize: '15px',
          fontWeight: 700,
          color: hovered ? '#22c55e' : 'var(--color-text)',
          fontFamily: 'var(--font-sans)',
          transition: 'color 0.15s',
          flex: 1,
          minWidth: 0,
        }}>
          {thesis.title}
        </h3>
        <HealthGauge score={thesis.health_score} size={48} />
      </div>

      {/* Description (2 lines) */}
      {thesis.description && (
        <p style={{
          fontSize: '12px',
          color: 'var(--color-dim)',
          marginTop: '10px',
          lineHeight: '1.5',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          fontFamily: 'var(--font-sans)',
        }}>
          {thesis.description}
        </p>
      )}

      {/* Score row in mono */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginTop: '14px',
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
      }}>
        <span style={{ color: 'var(--color-dim)' }}>
          Conv <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{thesis.conviction_score?.toFixed(1) ?? '–'}</span>
        </span>
        <span style={{ color: 'var(--color-dim)' }}>
          Evid <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{thesis.evidence_score?.toFixed(1) ?? '–'}</span>
        </span>
        <span style={{ color: 'var(--color-dim)' }}>
          Pulse <span style={{
            color: (thesis.news_pulse || 5) > 6 ? '#22c55e' : (thesis.news_pulse || 5) < 4 ? '#ef4444' : '#f59e0b',
            fontWeight: 500,
          }}>{thesis.news_pulse?.toFixed(1) ?? '–'}</span>
        </span>
      </div>

      {/* Footer: date + ticker badges */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-dim)' }}>
          {thesis.activation_date && (
            <span>{new Date(thesis.activation_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          )}
          <span>{thesis.node_count} nodes</span>
        </div>

        {thesis.top_tickers?.length > 0 && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {thesis.top_tickers.map(t => (
              <span key={t} style={{
                padding: '2px 8px',
                background: 'rgba(34,197,94,0.1)',
                color: '#22c55e',
                fontSize: '10px',
                borderRadius: '4px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
