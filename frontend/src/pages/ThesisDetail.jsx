import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getThesis, getTree, deleteThesis } from '../utils/api';
import TreeView from '../components/TreeView';

export default function ThesisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thesis, setThesis] = useState(null);
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getThesis(id).then(r => setThesis(r.data)),
      getTree(id).then(r => setTree(r.data.tree)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!confirm('Delete this thesis? This cannot be undone.')) return;
    try {
      await deleteThesis(id);
      navigate('/');
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '256px' }}>
        <Loader2 size={24} className="text-green animate-spin" />
      </div>
    );
  }

  if (!thesis) {
    return <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-dim)', fontSize: '14px' }}>Thesis not found.</div>;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', overflowX: 'hidden' }}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          color: 'var(--color-dim)',
          textDecoration: 'none',
          fontSize: '13px',
          fontFamily: 'var(--font-sans)',
          marginBottom: '20px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-accent-green)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-dim)'}
      >
        ← Back to Dashboard
      </Link>

      <TreeView tree={tree} thesis={thesis} onDelete={handleDelete} />
    </div>
  );
}
