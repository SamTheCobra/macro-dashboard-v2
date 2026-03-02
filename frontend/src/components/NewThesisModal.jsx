import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Sparkles } from 'lucide-react';
import { createThesis } from '../utils/api';

export default function NewThesisModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await createThesis(title.trim());
      onClose();
      navigate(`/thesis/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate thesis tree. Check your ANTHROPIC_API_KEY.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl w-full max-w-xl mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text flex items-center gap-2">
            <Sparkles size={18} className="text-green" />
            New Thesis
          </h2>
          <button onClick={onClose} className="text-dim hover:text-text transition-colors p-1 cursor-pointer bg-transparent border-0">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm text-dim mb-2">Enter your thesis</label>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Electricity demand will outpace supply through 2031 due to AI data centers"
            className="w-full bg-bg border border-border rounded-lg px-4 py-3 text-text text-sm resize-none h-28 focus:outline-none focus:border-green/50 placeholder:text-dim/50 font-[inherit]"
            disabled={loading}
            autoFocus
          />

          {error && (
            <p className="text-red text-sm mt-3">{error}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <p className="text-xs text-dim flex-1">
              Claude AI will generate a full causal tree with second & third-order effects, ticker symbols, and startup ideas.
            </p>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-green text-bg rounded-lg font-semibold text-sm hover:bg-green/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer border-0"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Tree'
              )}
            </button>
          </div>

          {loading && (
            <div className="mt-4 text-sm text-dim flex items-center gap-2">
              <div className="w-2 h-2 bg-green rounded-full animate-pulse" />
              Claude is analyzing your thesis and building the causal tree... This may take 15-30 seconds.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
