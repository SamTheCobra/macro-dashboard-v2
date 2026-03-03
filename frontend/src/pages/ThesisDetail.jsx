import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import { getThesis, getTree, deleteThesis } from '../utils/api';
import HealthGauge from '../components/HealthGauge';
import TreeView from '../components/TreeView';
import ConvictionLog from '../components/ConvictionLog';
import EvidenceChart from '../components/EvidenceChart';
import NewsPulse from '../components/NewsPulse';
import BetsTracker from '../components/BetsTracker';

const tabs = [
  { id: 'tree', label: 'Tree View', emoji: '🌳' },
  { id: 'evidence', label: 'Evidence', emoji: '📊' },
  { id: 'conviction', label: 'Conviction', emoji: '🎯' },
  { id: 'news', label: 'News Pulse', emoji: '📰' },
  { id: 'bets', label: 'Bets', emoji: '💰' },
];

export default function ThesisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thesis, setThesis] = useState(null);
  const [tree, setTree] = useState(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [loading, setLoading] = useState(true);
  const [deleteHovered, setDeleteHovered] = useState(false);

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
    <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
      {/* Back button */}
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
        onMouseEnter={e => e.currentTarget.style.color = '#22c55e'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-dim)'}
      >
        ← Back to Dashboard
      </Link>

      {/* Header: title + HealthRing */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-sans)', lineHeight: 1.3 }}>
            {thesis.title}
          </h1>
          {thesis.description && (
            <p style={{ fontSize: '14px', color: 'var(--color-dim)', marginTop: '12px', lineHeight: 1.6, maxWidth: '720px', fontFamily: 'var(--font-sans)' }}>
              {thesis.description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <HealthGauge score={thesis.health_score} size={72} />
          <button
            onClick={handleDelete}
            onMouseEnter={() => setDeleteHovered(true)}
            onMouseLeave={() => setDeleteHovered(false)}
            style={{
              background: 'transparent',
              border: `1px solid ${deleteHovered ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: '8px',
              padding: '10px',
              color: deleteHovered ? '#ef4444' : 'var(--color-dim)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            title="Delete thesis"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '12px',
        color: 'var(--color-dim)',
        fontFamily: 'var(--font-mono)',
        marginBottom: '28px',
        flexWrap: 'wrap',
      }}>
        {thesis.activation_date && (
          <>
            <span>Active since {new Date(thesis.activation_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <span style={{ color: 'var(--color-faint)' }}>·</span>
          </>
        )}
        <span>{thesis.node_count} tree nodes</span>
        {thesis.keywords?.length > 0 && (
          <>
            <span style={{ color: 'var(--color-faint)' }}>·</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {thesis.keywords.map(k => (
                <span key={k} style={{
                  padding: '2px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  color: 'var(--color-dim)',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {k}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        marginBottom: '24px',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #22c55e' : '2px solid transparent',
              color: activeTab === tab.id ? '#22c55e' : 'var(--color-dim)',
              fontSize: '13px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'color 0.15s',
            }}
          >
            <span style={{ fontSize: '14px' }}>{tab.emoji}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'tree' && <TreeView tree={tree} />}
        {activeTab === 'conviction' && <ConvictionLog thesisId={parseInt(id)} />}
        {activeTab === 'evidence' && <EvidenceChart thesisId={parseInt(id)} />}
        {activeTab === 'news' && <NewsPulse thesisId={parseInt(id)} />}
        {activeTab === 'bets' && <BetsTracker thesisId={parseInt(id)} />}
      </div>
    </div>
  );
}
