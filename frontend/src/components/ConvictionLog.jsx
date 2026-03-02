import { useState, useEffect } from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { getConviction, addConviction } from '../utils/api';

export default function ConvictionLog({ thesisId }) {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [score, setScore] = useState(5);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEntries();
  }, [thesisId]);

  const loadEntries = () => {
    getConviction(thesisId).then(r => setEntries(r.data)).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addConviction(thesisId, { score: parseInt(score), note });
      setNote('');
      setScore(5);
      setShowForm(false);
      loadEntries();
    } catch {
      // ignore
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Chart */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4">
        <h3 className="text-sm font-semibold text-text mb-4">Conviction Timeline</h3>
        {entries.length > 0 ? (
          <div className="h-40 flex items-end gap-1">
            {entries.map((entry, i) => {
              const height = (entry.score / 10) * 100;
              let barColor = 'bg-red';
              if (entry.score >= 7) barColor = 'bg-green';
              else if (entry.score >= 4) barColor = 'bg-amber';

              return (
                <div key={entry.id} className="flex-1 flex flex-col items-center gap-1" title={`${entry.score}/10 - ${entry.note || ''}`}>
                  <span className="text-[10px] text-dim">{entry.score}</span>
                  <div className={`w-full rounded-t ${barColor} transition-all`} style={{ height: `${height}%`, minHeight: '4px' }} />
                  <span className="text-[9px] text-dim">
                    {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-dim">No conviction entries yet.</p>
        )}
      </div>

      {/* Add entry */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">Log Entries</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green/10 text-green border border-green/30 rounded-lg hover:bg-green/20 cursor-pointer"
        >
          <Plus size={12} /> Add Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            <label className="text-xs text-dim">Score (0-10):</label>
            <input
              type="range"
              min="0"
              max="10"
              value={score}
              onChange={e => setScore(e.target.value)}
              className="flex-1 accent-green"
            />
            <span className="text-sm font-bold text-green w-6 text-center">{score}</span>
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="What changed your conviction?"
            className="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text resize-none h-20 focus:outline-none focus:border-green/50 font-[inherit] placeholder:text-dim/50"
          />
          <div className="flex justify-end mt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-green text-bg text-xs font-semibold rounded-lg hover:bg-green/90 disabled:opacity-50 cursor-pointer border-0"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}

      {/* Entries list */}
      <div className="space-y-2">
        {[...entries].reverse().map(entry => (
          <div key={entry.id} className="bg-card border border-border rounded-lg p-3 flex items-start gap-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${entry.score >= 7 ? 'bg-green/20 text-green' : entry.score >= 4 ? 'bg-amber/20 text-amber' : 'bg-red/20 text-red'}`}>
              {entry.score}
            </div>
            <div className="flex-1 min-w-0">
              {entry.note && <p className="text-xs text-text">{entry.note}</p>}
              <span className="text-[10px] text-dim mt-1 block">
                {entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
