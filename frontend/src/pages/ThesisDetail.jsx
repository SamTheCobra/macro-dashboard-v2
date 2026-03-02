import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, GitBranch, BarChart3, TrendingUp, Newspaper, DollarSign, Loader2, Trash2 } from 'lucide-react';
import { getThesis, getTree, deleteThesis } from '../utils/api';
import HealthGauge from '../components/HealthGauge';
import TreeView from '../components/TreeView';
import NodePanel from '../components/NodePanel';
import ConvictionLog from '../components/ConvictionLog';
import EvidenceChart from '../components/EvidenceChart';
import NewsPulse from '../components/NewsPulse';
import BetsTracker from '../components/BetsTracker';

const tabs = [
  { id: 'tree', label: 'Tree View', icon: GitBranch },
  { id: 'conviction', label: 'Conviction Log', icon: BarChart3 },
  { id: 'evidence', label: 'Evidence Chart', icon: TrendingUp },
  { id: 'news', label: 'News Pulse', icon: Newspaper },
  { id: 'bets', label: 'Bets', icon: DollarSign },
];

export default function ThesisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [thesis, setThesis] = useState(null);
  const [tree, setTree] = useState(null);
  const [activeTab, setActiveTab] = useState('tree');
  const [selectedNode, setSelectedNode] = useState(null);
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
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-green animate-spin" />
      </div>
    );
  }

  if (!thesis) {
    return <div className="text-center py-16 text-dim">Thesis not found.</div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link to="/" className="flex items-center gap-1 text-dim hover:text-green text-xs mb-3 no-underline transition-colors">
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-text">{thesis.title}</h1>
            {thesis.description && (
              <p className="text-sm text-dim mt-2 max-w-3xl leading-relaxed">{thesis.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-dim">
              {thesis.activation_date && (
                <span>Active since {new Date(thesis.activation_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              )}
              <span>{thesis.node_count} tree nodes</span>
              {thesis.keywords?.length > 0 && (
                <div className="flex gap-1">
                  {thesis.keywords.map(k => (
                    <span key={k} className="px-1.5 py-0.5 bg-muted text-dim rounded text-[10px]">{k}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <HealthGauge score={thesis.health_score} size={72} />
            <button
              onClick={handleDelete}
              className="text-dim hover:text-red cursor-pointer bg-transparent border border-border rounded-lg p-2 hover:border-red/30 transition-colors"
              title="Delete thesis"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-border">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
                activeTab === tab.id
                  ? 'text-green border-green'
                  : 'text-dim border-transparent hover:text-text'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-4">
        {activeTab === 'tree' && (
          <div className="flex gap-4">
            <div className="flex-1">
              <TreeView tree={tree} onNodeClick={setSelectedNode} />
            </div>
            {selectedNode && (
              <NodePanel node={selectedNode} onClose={() => setSelectedNode(null)} />
            )}
          </div>
        )}

        {activeTab === 'conviction' && <ConvictionLog thesisId={parseInt(id)} />}
        {activeTab === 'evidence' && <EvidenceChart thesisId={parseInt(id)} />}
        {activeTab === 'news' && <NewsPulse thesisId={parseInt(id)} />}
        {activeTab === 'bets' && <BetsTracker thesisId={parseInt(id)} />}
      </div>
    </div>
  );
}
