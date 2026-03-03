import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { getBets, createBet, deleteBet } from '../utils/api';

const cellBase = {
  padding: '10px 16px',
  fontFamily: 'var(--font-mono)',
  fontSize: '12px',
};

const headerCell = {
  ...cellBase,
  color: 'var(--color-dim)',
  fontWeight: 500,
  fontFamily: 'var(--font-sans)',
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

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

  const inputStyle = {
    width: '100%', background: 'var(--color-bg)', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: 'var(--color-text)',
    fontFamily: 'var(--font-mono)', outline: 'none',
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text)', fontFamily: 'var(--font-sans)' }}>Bets</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '6px 12px', fontSize: '12px',
            background: 'rgba(34,197,94,0.1)', color: '#22c55e',
            border: '1px solid rgba(34,197,94,0.3)', borderRadius: '8px',
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          + Add Bet
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px', padding: '16px', marginBottom: '16px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Ticker</label>
              <input value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="AAPL" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Direction</label>
              <select value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })} style={inputStyle}>
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Entry Price</label>
              <input type="number" step="0.01" value={form.entry_price} onChange={e => setForm({ ...form, entry_price: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Target Price</label>
              <input type="number" step="0.01" value={form.target_price} onChange={e => setForm({ ...form, target_price: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Stop Loss</label>
              <input type="number" step="0.01" value={form.stop_loss} onChange={e => setForm({ ...form, stop_loss: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Position Size %</label>
              <input type="number" step="0.1" value={form.position_size_pct} onChange={e => setForm({ ...form, position_size_pct: e.target.value })} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inputStyle}>
                <option value="watching">Watching</option>
                <option value="active">Active</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '10px', color: 'var(--color-dim)', display: 'block', marginBottom: '4px', fontFamily: 'var(--font-sans)' }}>Notes</label>
            <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="submit" style={{
              padding: '6px 16px', background: '#22c55e', color: 'var(--color-bg)',
              fontSize: '12px', fontWeight: 600, borderRadius: '8px', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
            }}>
              Add Bet
            </button>
          </div>
        </form>
      )}

      {/* CSS Grid table */}
      <div style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '80px 60px 80px 80px 80px 80px 60px 80px 70px 40px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ ...headerCell, textAlign: 'left' }}>Ticker</div>
          <div style={{ ...headerCell, textAlign: 'left' }}>Dir</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>Entry</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>Current</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>Target</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>Stop</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>Size%</div>
          <div style={{ ...headerCell, textAlign: 'center' }}>Status</div>
          <div style={{ ...headerCell, textAlign: 'right' }}>P&L</div>
          <div style={headerCell} />
        </div>

        {bets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--color-dim)', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
            No bets yet.
          </div>
        ) : (
          bets.map(b => {
            const dirColor = b.direction === 'long' ? '#22c55e' : '#ef4444';
            const pnlColor = (b.pnl_pct || 0) >= 0 ? '#22c55e' : '#ef4444';
            const statusStyle = b.status === 'active'
              ? { background: 'rgba(34,197,94,0.1)', color: '#22c55e' }
              : b.status === 'closed'
                ? { background: 'rgba(255,255,255,0.05)', color: 'var(--color-dim)' }
                : { background: 'rgba(245,158,11,0.1)', color: '#f59e0b' };

            return (
              <div key={b.id} style={{
                display: 'grid',
                gridTemplateColumns: '80px 60px 80px 80px 80px 80px 60px 80px 70px 40px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'center',
                transition: 'background 0.1s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ ...cellBase, fontWeight: 600, color: '#22c55e' }}>{b.ticker}</div>
                <div style={{ ...cellBase, color: dirColor }}>
                  {b.direction === 'long' ? '▲' : '▼'} {b.direction}
                </div>
                <div style={{ ...cellBase, textAlign: 'right', color: 'var(--color-text)' }}>{b.entry_price?.toFixed(2) ?? '–'}</div>
                <div style={{ ...cellBase, textAlign: 'right', color: 'var(--color-text)' }}>{b.current_price?.toFixed(2) ?? '–'}</div>
                <div style={{ ...cellBase, textAlign: 'right', color: 'var(--color-dim)' }}>{b.target_price?.toFixed(2) ?? '–'}</div>
                <div style={{ ...cellBase, textAlign: 'right', color: 'var(--color-dim)' }}>{b.stop_loss?.toFixed(2) ?? '–'}</div>
                <div style={{ ...cellBase, textAlign: 'right', color: 'var(--color-dim)' }}>{b.position_size_pct ?? '–'}%</div>
                <div style={{ ...cellBase, textAlign: 'center' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 500,
                    fontFamily: 'var(--font-sans)', ...statusStyle,
                  }}>
                    {b.status}
                  </span>
                </div>
                <div style={{ ...cellBase, textAlign: 'right', fontWeight: 600, color: pnlColor }}>
                  {b.pnl_pct != null ? `${b.pnl_pct > 0 ? '+' : ''}${b.pnl_pct.toFixed(1)}%` : '–'}
                </div>
                <div style={{ ...cellBase, textAlign: 'center' }}>
                  <button
                    onClick={() => handleDelete(b.id)}
                    style={{
                      background: 'transparent', border: 'none', padding: '4px',
                      color: 'var(--color-dim)', cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
