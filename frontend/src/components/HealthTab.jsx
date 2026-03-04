import { useState, useEffect, useCallback } from 'react';
import { getEvidence, getConviction, addConviction } from '../utils/api';
import HealthGauge from './HealthGauge';

const colorMap = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444' };

function scoreColor(score) {
  if (score >= 7) return '#22c55e';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

function scoreBg(score) {
  if (score >= 7) return 'rgba(34,197,94,0.15)';
  if (score >= 4) return 'rgba(245,158,11,0.15)';
  return 'rgba(239,68,68,0.15)';
}

export default function HealthTab({ thesisId }) {
  const [evidence, setEvidence] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState(5);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = useCallback(() => {
    getConviction(thesisId).then(r => setEntries(r.data)).catch(() => {});
  }, [thesisId]);

  useEffect(() => {
    getEvidence(thesisId).then(r => setEvidence(r.data)).catch(() => {});
    loadEntries();
  }, [thesisId, loadEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await addConviction(thesisId, { score: parseInt(score), note });
      setNote('');
      setScore(5);
      setShowForm(false);
      loadEntries();
    } catch {
      // ignore
    }
    setSaving(false);
  };

  if (!evidence) {
    return <div style={{ fontSize: '13px', color: 'var(--color-dim)' }}>Loading health data...</div>;
  }

  const healthColor = evidence.health_score >= 70 ? '#22c55e' : evidence.health_score >= 50 ? '#f59e0b' : '#ef4444';

  const metrics = [
    { label: 'Conviction Score', value: evidence.conviction_score, max: 10,
      color: evidence.conviction_score >= 7 ? 'green' : evidence.conviction_score >= 4 ? 'amber' : 'red',
      description: 'Set manually. Reflects your belief in the thesis.' },
    { label: 'Evidence Score', value: evidence.evidence_score, max: 10,
      color: evidence.evidence_score >= 7 ? 'green' : evidence.evidence_score >= 4 ? 'amber' : 'red',
      description: '70% ticker performance + 30% news pulse.' },
    { label: 'Ticker Performance', value: evidence.ticker_performance_score, max: 10,
      color: evidence.ticker_performance_score >= 7 ? 'green' : evidence.ticker_performance_score >= 4 ? 'amber' : 'red',
      description: 'Price movement of tickers since activation date.' },
    { label: 'News Pulse', value: evidence.news_pulse_score, max: 10,
      color: evidence.news_pulse_score >= 7 ? 'green' : evidence.news_pulse_score >= 4 ? 'amber' : 'red',
      description: 'Ratio of confirming vs contradicting headlines.' },
  ];

  return (
    <div>
      {/* Health Score ring + formula */}
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

      {/* 2x2 Score bars */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
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
            <div style={{ height: '6px', background: 'var(--color-bg)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', background: colorMap[m.color],
                width: `${(m.value / m.max) * 100}%`, transition: 'width 0.3s ease',
              }} />
            </div>
            <p style={{ fontSize: '10px', color: 'var(--color-dim)', marginTop: '8px', fontFamily: 'var(--font-sans)' }}>{m.description}</p>
          </div>
        ))}
      </div>

      {/* Conviction Timeline */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', marginBottom: '16px' }}>
          Conviction Timeline
        </h3>
        {entries.length > 0 ? (
          <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', gap: '4px' }}>
            {entries.map((entry) => {
              const pct = Math.max(0, Math.min(100, (entry.score / 10) * 100));
              return (
                <div key={entry.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} title={`${entry.score}/10 – ${entry.note || ''}`}>
                  <span style={{ fontSize: '10px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>{entry.score}</span>
                  <div style={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    background: scoreColor(entry.score),
                    height: `${pct}%`, minHeight: '4px',
                  }} />
                  <span style={{ fontSize: '9px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                    {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ fontSize: '13px', color: 'var(--color-dim)' }}>No conviction entries yet.</p>
        )}
      </div>

      {/* Log Entries header + Add button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>Log Entries</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', fontSize: '12px',
            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          + Add Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)' }}>Score (0-10):</label>
            <input type="range" min="0" max="10" value={score} onChange={e => setScore(e.target.value)} className="accent-green" style={{ flex: 1 }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#22c55e', width: '24px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{score}</span>
          </div>
          <textarea
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="What changed your conviction?"
            style={{
              width: '100%', background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--color-text)',
              resize: 'none', height: '80px', fontFamily: 'var(--font-sans)', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" disabled={saving} style={{
              padding: '6px 16px', background: '#22c55e', color: 'var(--color-bg)',
              fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: 'none',
              cursor: 'pointer', opacity: saving ? 0.5 : 1, fontFamily: 'var(--font-sans)',
            }}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Entry cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[...entries].reverse().map(entry => (
          <div key={entry.id} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '10px', padding: '14px',
            display: 'flex', alignItems: 'flex-start', gap: '12px',
          }}>
            <div style={{
              flexShrink: 0, width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)',
              background: scoreBg(entry.score), color: scoreColor(entry.score),
            }}>
              {entry.score}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {entry.note && <p style={{ fontSize: '13px', color: 'var(--color-text)', fontFamily: 'var(--font-sans)', lineHeight: 1.5 }}>{entry.note}</p>}
              <span style={{ fontSize: '10px', color: 'var(--color-dim)', marginTop: '4px', display: 'block', fontFamily: 'var(--font-mono)' }}>
                {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
