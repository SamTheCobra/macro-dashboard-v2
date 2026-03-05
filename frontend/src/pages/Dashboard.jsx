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
