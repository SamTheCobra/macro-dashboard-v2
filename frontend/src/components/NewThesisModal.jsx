import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2 } from 'lucide-react';
import { createThesis } from '../utils/api';

export default function NewThesisModal({ onClose }) {
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [btnHovered, setBtnHovered] = useState(false);
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
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-modal-overlay)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div style={{
        width: '100%',
        maxWidth: '560px',
        margin: '0 16px',
        background: 'var(--color-modal-bg)',
        border: '1px solid var(--color-border-hover)',
        borderRadius: '16px',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 8px 32px var(--color-shadow)',
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-dim)',
            cursor: 'pointer',
            padding: '4px',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--color-dim)'}
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2 style={{
          fontSize: '22px',
          fontWeight: 700,
          color: 'var(--color-accent-amber)',
          fontFamily: 'var(--font-sans)',
          marginBottom: '8px',
        }}>
          New Thesis
        </h2>

        {/* Subtitle */}
        <p style={{
          fontSize: '14px',
          color: 'var(--color-dim)',
          lineHeight: 1.5,
          fontFamily: 'var(--font-sans)',
          marginBottom: '24px',
        }}>
          Describe a macro thesis and Claude will map out the causal chain, relevant tickers, and startup opportunities.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Electricity demand will outpace supply through 2031 due to AI data centers"
            disabled={loading}
            autoFocus
            style={{
              width: '100%',
              minHeight: '120px',
              background: 'var(--color-input-bg)',
              border: '1px solid var(--color-input-border)',
              borderRadius: '10px',
              padding: '16px',
              fontSize: '15px',
              lineHeight: 1.5,
              color: 'var(--color-text)',
              fontFamily: 'var(--font-sans)',
              resize: 'none',
              outline: 'none',
              transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(34,197,94,0.4)'}
            onBlur={e => e.target.style.borderColor = 'var(--color-input-border)'}
          />

          {error && (
            <div style={{
              marginTop: '12px',
              padding: '12px 16px',
              background: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
              borderRadius: '8px',
              fontSize: '14px',
              color: '#ef4444',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.4,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            onMouseEnter={() => setBtnHovered(true)}
            onMouseLeave={() => setBtnHovered(false)}
            style={{
              width: '100%',
              height: '48px',
              marginTop: '16px',
              background: loading || !title.trim()
                ? 'rgba(34,197,94,0.3)'
                : btnHovered
                  ? 'linear-gradient(135deg, #16a34a, #22c55e)'
                  : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: 700,
              color: '#fff',
              fontFamily: 'var(--font-sans)',
              cursor: loading || !title.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !title.trim() ? 0.5 : 1,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Generating...
              </>
            ) : (
              'Generate Tree'
            )}
          </button>

          {loading && (
            <div style={{
              marginTop: '12px',
              fontSize: '13px',
              color: 'var(--color-dim)',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{
                width: '6px',
                height: '6px',
                background: '#22c55e',
                borderRadius: '50%',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              Claude is analyzing your thesis and building the causal tree... This may take 15-30 seconds.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
