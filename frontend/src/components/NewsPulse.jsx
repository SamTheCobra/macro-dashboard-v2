import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { getNews, fetchNews, getNewsPulse } from '../utils/api';

const classColors = {
  confirming: { color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
  neutral: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
  contradicting: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
};

const classEmoji = { confirming: '✅', neutral: '➖', contradicting: '❌' };

export default function NewsPulse({ thesisId }) {
  const [articles, setArticles] = useState([]);
  const [pulse, setPulse] = useState(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadData();
  }, [thesisId]);

  const loadData = () => {
    getNews(thesisId).then(r => setArticles(r.data)).catch(() => {});
    getNewsPulse(thesisId).then(r => setPulse(r.data.pulse_score)).catch(() => {});
  };

  const handleFetch = async () => {
    setFetching(true);
    try {
      await fetchNews(thesisId);
      loadData();
    } catch {
      // ignore
    }
    setFetching(false);
  };

  const pulseColor = (pulse || 5) > 6 ? '#22c55e' : (pulse || 5) < 4 ? '#ef4444' : '#f59e0b';

  return (
    <div>
      {/* Pulse score header */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>News Pulse Score</h3>
          <p style={{ fontSize: '11px', color: 'var(--color-dim)', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>
            Confirming vs contradicting headlines (30 days)
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, color: pulseColor, fontFamily: 'var(--font-mono)' }}>
            {pulse != null ? pulse.toFixed(1) : '–'}
          </span>
          <button
            onClick={handleFetch}
            disabled={fetching}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', fontSize: '12px',
              background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
              border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px',
              cursor: fetching ? 'not-allowed' : 'pointer', opacity: fetching ? 0.5 : 1,
              fontFamily: 'var(--font-sans)',
            }}
          >
            <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} />
            {fetching ? 'Fetching...' : 'Fetch News'}
          </button>
        </div>
      </div>

      {/* Headlines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {articles.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px 0',
            border: '2px dashed rgba(255,255,255,0.08)',
            borderRadius: '12px',
            color: 'var(--color-dim)',
            fontSize: '13px',
            fontFamily: 'var(--font-sans)',
          }}>
            No news articles yet. Click "Fetch News" to pull headlines.
          </div>
        ) : (
          articles.map(a => {
            const cls = classColors[a.classification] || classColors.neutral;
            return (
              <div key={a.id} style={{
                background: cls.bg,
                border: `1px solid ${cls.border}`,
                borderRadius: '10px',
                padding: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <span style={{ fontSize: '13px', flexShrink: 0, marginTop: '1px' }}>
                  {classEmoji[a.classification] || classEmoji.neutral}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px', fontWeight: 500, color: 'var(--color-text)',
                      textDecoration: 'none', fontFamily: 'var(--font-sans)',
                    }}
                  >
                    {a.title}
                  </a>
                  {a.summary && (
                    <p style={{ fontSize: '11px', color: 'var(--color-dim)', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>{a.summary}</p>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', fontSize: '10px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
                    {a.source && <span>{a.source}</span>}
                    {a.published_at && <span>{new Date(a.published_at).toLocaleDateString()}</span>}
                    <span style={{ color: cls.color, fontWeight: 500, textTransform: 'capitalize' }}>{a.classification}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
