import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { getBets, createBet, deleteBet } from '../utils/api';

export default function BetsTracker({ thesisId }) {
  const [bets, setBets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    ticker: '', direction: 'long', entry_price: '', target_price: '',
    stop_loss: '', position_size_pct: '', status: 'watching', notes: '',
  });

  useEffect(() => {
    loadBets();
  }, [thesisId]);

  const loadBets = () => {
    getBets(thesisId).then(r => setBets(r.data)).catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.ticker) return;

    const data = {
      ...form,
      entry_price: form.entry_price ? parseFloat(form.entry_price) : null,
      target_price: form.target_price ? parseFloat(form.target_price) : null,
      stop_loss: form.stop_loss ? parseFloat(form.stop_loss) : null,
      position_size_pct: form.position_size_pct ? parseFloat(form.position_size_pct) : null,
    };

    try {
      await createBet(thesisId, data);
      setShowForm(false);
      setForm({ ticker: '', direction: 'long', entry_price: '', target_price: '', stop_loss: '', position_size_pct: '', status: 'watching', notes: '' });
      loadBets();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBet(id);
      loadBets();
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text">Bets</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green/10 text-green border border-green/30 rounded-lg hover:bg-green/20 cursor-pointer"
        >
          <Plus size={12} /> Add Bet
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-dim block mb-1">Ticker</label>
              <input
                value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                placeholder="AAPL"
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-green/50 font-[inherit]"
              />
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">Direction</label>
              <select
                value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none font-[inherit]"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">Entry Price</label>
              <input type="number" step="0.01" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: e.target.value })}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-green/50 font-[inherit]"
              />
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">Target Price</label>
              <input type="number" step="0.01" value={form.target_price} onChange={e => setForm({ ...form, target_price: e.target.value })}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-green/50 font-[inherit]"
              />
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">Stop Loss</label>
              <input type="number" step="0.01" value={form.stop_loss} onChange={e => setForm({ ...form, stop_loss: e.target.value })}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-green/50 font-[inherit]"
              />
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">Position Size %</label>
              <input type="number" step="0.1" value={form.position_size_pct} onChange={e => setForm({ ...form, position_size_pct: e.target.value })}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-green/50 font-[inherit]"
              />
            </div>
            <div>
              <label className="text-[10px] text-dim block mb-1">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none font-[inherit]"
              >
                <option value="watching">Watching</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[10px] text-dim block mb-1">Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-bg border border-border rounded px-2 py-1.5 text-xs text-text focus:outline-none focus:border-green/50 font-[inherit]"
            />
          </div>
          <div className="flex justify-end mt-3">
            <button type="submit" className="px-4 py-1.5 bg-green text-bg text-xs font-semibold rounded-lg hover:bg-green/90 cursor-pointer border-0">
              Add Bet
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-dim">
                <th className="text-left px-4 py-3 font-medium">Ticker</th>
                <th className="text-left px-4 py-3 font-medium">Dir</th>
                <th className="text-right px-4 py-3 font-medium">Entry</th>
                <th className="text-right px-4 py-3 font-medium">Current</th>
                <th className="text-right px-4 py-3 font-medium">Target</th>
                <th className="text-right px-4 py-3 font-medium">Stop</th>
                <th className="text-right px-4 py-3 font-medium">Size%</th>
                <th className="text-center px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">P&L</th>
                <th className="text-center px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {bets.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-dim">No bets yet.</td>
                </tr>
              ) : (
                bets.map(b => (
                  <tr key={b.id} className="border-b border-border/50 hover:bg-muted/50">
                    <td className="px-4 py-3 font-semibold text-green">{b.ticker}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 ${b.direction === 'long' ? 'text-green' : 'text-red'}`}>
                        {b.direction === 'long' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {b.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-text">{b.entry_price?.toFixed(2) ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-text">{b.current_price?.toFixed(2) ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-dim">{b.target_price?.toFixed(2) ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-dim">{b.stop_loss?.toFixed(2) ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-dim">{b.position_size_pct ?? '-'}%</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${b.status === 'active' ? 'bg-green/10 text-green' : b.status === 'closed' ? 'bg-dim/20 text-dim' : 'bg-amber/10 text-amber'}`}>
                        {b.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${(b.pnl_pct || 0) >= 0 ? 'text-green' : 'text-red'}`}>
                      {b.pnl_pct != null ? `${b.pnl_pct > 0 ? '+' : ''}${b.pnl_pct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(b.id)} className="text-dim hover:text-red cursor-pointer bg-transparent border-0 p-1">
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
