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
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-green animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text">Active Theses</h1>
          <p className="text-sm text-dim mt-1">Sorted by Health Score</p>
        </div>
        <span className="text-sm text-dim">{theses.length} thesis{theses.length !== 1 ? 'es' : ''}</span>
      </div>

      {theses.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-dim text-sm">No theses yet. Click "New Thesis" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {theses.map(t => (
            <ThesisCard key={t.id} thesis={t} />
          ))}
        </div>
      )}
    </div>
  );
}
