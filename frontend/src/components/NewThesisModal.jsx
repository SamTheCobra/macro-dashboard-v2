import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { createThesis } from '../utils/api';
import axios from 'axios';

export default function NewThesisModal({ onClose }) {
  const [step, setStep] = useState('input'); // 'input' | 'confirm'
  const [raw, setRaw] = useState('');
  const [condensed, setCondensed] = useState('');
  const [condensing, setCondensing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [btnHovered, setBtnHovered] = useState(false);
  const navigate = useNavigate();

  const handleCondense = async () => {
    if (!raw.trim()) return;
    setCondensing(true);
    setError(null);
    try {
      const res = await axios.post('/api/theses/condense', { title: raw.trim() });
      setCondensed(res.data.condensed);
      setStep('confirm');
    } catch {
      setError('Failed to condense title. Try again.');
    } finally {
      setCondensing(false);
    }
  };

  const handleSubmit = async () => {
    if (!condensed.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await createThesis(condensed.trim());
      onClose();
      navigate(`/thesis/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate thesis tree. Check your ANTHROPIC_API_KEY.');
      setLoading(false);
    }
  };

  const modalStyle = {
    position: 'fixed', inset: 0, zIndex: 50,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--color-modal-overlay)',
    backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
  };

  const cardStyle = {
    width: '100%', maxWidth: '560px', margin: '0 16px',
    background: 'var(--color-modal-bg)',
    border: '1px solid var(--color-border-hover)',
    borderRadius: '16px', padding: '32px', position: 'relative',
    boxShadow: '0 8px 32px var(--color-shadow)',
  };

  const btnStyle = (disabled) => ({
    width: '100%', height: '48px', marginTop: '16px',
    background: disabled ? 'rgba(34,197,94,0.3)' : btnHovered
      ? 'linear-gradient(135deg, #16a34a, #22c55e)'
      : 'linear-gradient(135deg, #22c55e, #16a34a)',
    border: 'none', borderRadius: '10px',
    fontSize: '16px', fontWeight: 700, color: '#fff',
    fontFamily: 'var(--font-sans)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
  });

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={modalStyle}>
      <div style={cardStyle}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '16px', right: '16px',
          background: 'transparent', border: 'none',
          color: 'var(--color-dim)', cursor: 'pointer', padding: '4px',
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-dim)'}
        >
          <X size={20} />
        </button>

        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-accent-amber)', fontFamily: 'var(--font-sans)', marginBottom: '8px' }}>
          {step === 'input' ? 'New Thesis' : 'Confirm Title'}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--color-dim)', lineHeight: 1.5, fontFamily: 'var(--font-sans)', marginBottom: '24px' }}>
          {step === 'input'
            ? 'Describe a macro thesis — Claude will condense it into a punchy title, then map out the causal chain.'
            : 'Edit the title if needed, then generate the tree.'}
        </p>

        {step === 'input' ? (
          <>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="e.g., Everyone is staring at their phones 6 hours a day so there'll be a massive counter-trend toward physical, tactile experiences like vinyl and film photography"
              disabled={condensing}
              autoFocus
              style={{
                width: '100%', minHeight: '120px',
                background: 'var(--color-input-bg)',
                border: '1px solid var(--color-input-border)',
                borderRadius: '10px', padding: '16px',
                fontSize: '15px', lineHeight: 1.5,
                color: 'var(--color-text)', fontFamily: 'var(--font-sans)',
                resize: 'none', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(34,197,94,0.4)'}
              onBlur={e => e.target.style.borderColor = 'var(--color-input-border)'}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCondense(); }}
            />
            {error && <div style={{ marginTop: '12px', padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: '8px', fontSize: '14px', color: '#ef4444', fontFamily: 'var(--font-sans)' }}>{error}</div>}
            <button
              disabled={condensing || !raw.trim()}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              onClick={handleCondense}
              style={btnStyle(condensing || !raw.trim())}
            >
              {condensing ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Condensing...</> : 'Condense Title →'}
            </button>
          </>
        ) : (
          <>
            <input
              value={condensed}
              onChange={(e) => setCondensed(e.target.value)}
              disabled={loading}
              autoFocus
              style={{
                width: '100%', background: 'var(--color-input-bg)',
                border: '1px solid rgba(34,197,94,0.4)',
                borderRadius: '10px', padding: '16px',
                fontSize: '16px', fontWeight: 600,
                color: 'var(--color-text)', fontFamily: 'var(--font-sans)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={() => setStep('input')}
              style={{ marginTop: '10px', background: 'none', border: 'none', color: 'var(--color-dim)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font-sans)', padding: 0 }}
            >
              ← Back to edit description
            </button>
            {error && <div style={{ marginTop: '12px', padding: '12px 16px', background: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)', borderRadius: '8px', fontSize: '14px', color: '#ef4444', fontFamily: 'var(--font-sans)' }}>{error}</div>}
            <button
              disabled={loading || !condensed.trim()}
              onMouseEnter={() => setBtnHovered(true)}
              onMouseLeave={() => setBtnHovered(false)}
              onClick={handleSubmit}
              style={btnStyle(loading || !condensed.trim())}
            >
              {loading ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : 'Generate Tree'}
            </button>
            {loading && (
              <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-dim)', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%', animation: 'pulse 1.5s ease-in-out infinite' }} />
                Claude is building the causal tree... 15-30 seconds.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
