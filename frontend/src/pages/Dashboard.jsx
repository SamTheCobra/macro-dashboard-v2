import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getTheses } from '../utils/api';
import ThesisCard from '../components/ThesisCard';
import NewThesisModal from '../components/NewThesisModal';

export default function Dashboard() {
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    getTheses()
      .then(r => setTheses(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '0 32px' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '64px 0 48px' }}>
        <h1 style={{
          fontSize: '72px',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          fontFamily: 'var(--font-sans)',
          marginBottom: '24px',
        }}>
          <span style={{ color: 'var(--color-accent-green)' }}>Tangent</span>
          <span style={{ color: 'var(--color-text)' }}>Book</span>
        </h1>

        <p style={{
          fontSize: '17px',
          color: 'var(--color-dim)',
          lineHeight: 1.7,
          fontFamily: 'var(--font-sans)',
          maxWidth: '580px',
          margin: '0 auto 36px',
        }}>
          Nobody can predict the future. But some things are clearly in motion — and if you follow the chain far enough, you start to see where the value will land. Tangent Book is how I think through what's changing, what follows from that, and where to put money on it.
        </p>

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 32px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#fff',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          + New Thesis
        </button>
      </div>

      {/* Thesis list header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderTop: '1px solid var(--color-border)', paddingTop: '32px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>Active Theses</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-dim)', marginTop: '2px', fontFamily: 'var(--font-sans)' }}>Sorted by Health Score</p>
        </div>
        <span style={{ fontSize: '14px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
          {theses.length} thes{theses.length !== 1 ? 'es' : 'is'}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-accent-green)' }} />
        </div>
      ) : theses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <p style={{ color: 'var(--color-dim)', fontSize: '13px' }}>No theses yet. Add your first one above.</p>
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

      {showModal && <NewThesisModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
