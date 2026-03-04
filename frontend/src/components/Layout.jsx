import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { getMacroRegime } from '../utils/api';
import NewThesisModal from './NewThesisModal';

const regimeColors = {
  'Risk-On': '#22c55e',
  'Easing': '#22c55e',
  'Neutral': 'rgba(255,255,255,0.45)',
  'Reflation': '#f59e0b',
  'Tightening': '#ef4444',
  'Risk-Off': '#ef4444',
  'Stagflation': '#ef4444',
};

export default function Layout() {
  const [regime, setRegime] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
        background: 'rgba(255,255,255,0.02)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
      }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '18px' }}>📈</span>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>
            <span style={{ color: '#22c55e' }}>MACRO</span>
            <span style={{ color: 'rgba(255,255,255,0.7)' }}>DASH</span>
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginLeft: '2px' }}>v2</span>
        </Link>

        {/* Macro regime */}
        {regime && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontFamily: 'var(--font-mono)', fontSize: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={13} style={{ color: regimeColors[regime.regime] || 'rgba(255,255,255,0.45)' }} />
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Regime</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>{regime.regime}</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px' }}>({regime.confidence})</span>
            </div>
            {regime.fed_funds_rate != null && (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                FFR <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{regime.fed_funds_rate.toFixed(2)}%</span>
              </span>
            )}
            {regime.yield_spread != null && (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                10Y-2Y <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{regime.yield_spread.toFixed(2)}%</span>
              </span>
            )}
            {regime.vix != null && (
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                VIX <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 500 }}>{regime.vix.toFixed(1)}</span>
              </span>
            )}
          </div>
        )}

        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 16px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.3)',
            color: '#22c55e',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(34,197,94,0.1)'}
        >
          + New Thesis
        </button>
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
