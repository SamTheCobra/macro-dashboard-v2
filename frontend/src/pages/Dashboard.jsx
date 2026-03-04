import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getTheses } from '../utils/api';
import ThesisCard from '../components/ThesisCard';

export default function Dashboard() {
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>Active Theses</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-dim)', marginTop: '4px', fontFamily: 'var(--font-sans)' }}>Sorted by Health Score</p>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--color-dim)', fontFamily: 'var(--font-mono)' }}>
          {theses.length} thesis{theses.length !== 1 ? 'es' : ''}
        </span>
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
    </div>
  );
}
