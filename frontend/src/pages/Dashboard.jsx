import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTheses } from '../utils/api';
import ThesisCard from '../components/ThesisCard';
import NewThesisModal from '../components/NewThesisModal';

export default function Dashboard() {
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getTheses()
      .then(r => setTheses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <Loader2 size={24} className="text-green animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 32px' }}>
      {/* Hero section */}
      <div style={{ textAlign: 'center', padding: '48px 0 40px' }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '36px',
          fontWeight: 700,
          letterSpacing: '-0.03em',
          marginBottom: '12px',
        }}>
          <span style={{ color: 'var(--color-accent-green)' }}>Tangent</span>
          <span style={{ color: 'var(--color-secondary)' }}>Book</span>
        </h1>
        <p style={{
          color: 'var(--color-dim)',
          fontSize: '14px',
          maxWidth: '520px',
          margin: '0 auto 24px',
          lineHeight: '1.6',
        }}>
          Track your macro investment theses, gather evidence, and monitor conviction over time.
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 24px',
            background: 'var(--color-btn-new-bg)',
            border: '1px solid var(--color-btn-new-border)',
            color: 'var(--color-accent-green)',
            borderRadius: '8px',
            fontSize: '15px',
            fontWeight: 600,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--color-btn-new-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'var(--color-btn-new-bg)'}
        >
          + New Thesis
        </button>
      </div>

      {theses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ color: 'var(--color-dim)', fontSize: '13px' }}>No theses yet. Click "+ New Thesis" to create one.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '16px',
        }}>
          {theses.map(t => (
            <ThesisCard key={t.id} thesis={t} />
          ))}
        </div>
      )}

      {showModal && (
        <NewThesisModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
