import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity, Sun, Moon } from 'lucide-react';
import { getMacroRegime } from '../utils/api';
import { useTheme } from '../contexts/ThemeContext';
import NewThesisModal from './NewThesisModal';

const regimeColors = {
  'Risk-On': '#22c55e',
  'Easing': '#22c55e',
  'Neutral': 'var(--color-dim)',
  'Reflation': '#f59e0b',
  'Tightening': '#ef4444',
  'Risk-Off': '#ef4444',
  'Stagflation': '#ef4444',
};

export default function Layout() {
  const [regime, setRegime] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    getMacroRegime()
      .then(r => setRegime(r.data))
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        height: '52px',
        background: 'var(--color-header-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-header-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '18px' }}>📈</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>
            <span style={{ color: 'var(--color-accent-green)' }}>MACRO</span>
            <span style={{ color: 'var(--color-secondary)' }}>DASH</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-faint)', marginLeft: '2px' }}>v2</span>
        </Link>

        {/* Macro regime */}
        {regime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={13} style={{ color: regimeColors[regime.regime] || 'var(--color-dim)' }} />
              <span style={{ color: 'var(--color-dim)' }}>Regime</span>
              <span style={{ color: 'var(--color-accent-amber)', fontWeight: 600 }}>{regime.regime}</span>
              <span style={{ color: 'var(--color-faint)', fontSize: '10px' }}>({regime.confidence})</span>
            </div>
            {regime.fed_funds_rate != null && (
              <span style={{ color: 'var(--color-dim)' }}>
                FFR <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{regime.fed_funds_rate.toFixed(2)}%</span>
              </span>
            )}
            {regime.yield_spread != null && (
              <span style={{ color: 'var(--color-dim)' }}>
                10Y-2Y <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{regime.yield_spread.toFixed(2)}%</span>
              </span>
            )}
            {regime.vix != null && (
              <span style={{ color: 'var(--color-dim)' }}>
                VIX <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>{regime.vix.toFixed(1)}</span>
              </span>
            )}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              color: 'var(--color-dim)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.borderColor = 'var(--color-border-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-dim)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={() => setShowModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              background: 'var(--color-btn-new-bg)',
              border: '1px solid var(--color-btn-new-border)',
              color: theme === 'light' ? '#ffffff' : '#22c55e',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-btn-new-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--color-btn-new-bg)'}
          >
            + New Thesis
          </button>
        </div>
      </header>

      {/* Main content */}
      <main style={{ padding: '32px' }}>
        <Outlet />
      </main>

      {showModal && (
        <NewThesisModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
