import { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Activity, Plus, TrendingUp } from 'lucide-react';
import { getMacroRegime } from '../utils/api';
import NewThesisModal from './NewThesisModal';

const regimeColors = {
  'Risk-On': 'text-green',
  'Easing': 'text-green',
  'Neutral': 'text-dim',
  'Reflation': 'text-amber',
  'Tightening': 'text-red',
  'Risk-Off': 'text-red',
  'Stagflation': 'text-red',
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
    <div className="min-h-screen bg-bg">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/90 backdrop-blur">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3 no-underline">
            <TrendingUp className="text-green" size={22} />
            <span className="text-lg font-semibold text-text tracking-tight">
              MACRO<span className="text-green">DASH</span> v2
            </span>
          </Link>

          {/* Macro regime */}
          {regime && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Activity size={14} className={regimeColors[regime.regime] || 'text-dim'} />
                <span className="text-dim">Regime:</span>
                <span className={`font-semibold ${regimeColors[regime.regime] || 'text-dim'}`}>
                  {regime.regime}
                </span>
                <span className="text-dim text-xs">({regime.confidence})</span>
              </div>
              {regime.fed_funds_rate != null && (
                <span className="text-dim">
                  FFR: <span className="text-text">{regime.fed_funds_rate.toFixed(2)}%</span>
                </span>
              )}
              {regime.yield_spread != null && (
                <span className="text-dim">
                  10Y-2Y: <span className="text-text">{regime.yield_spread.toFixed(2)}%</span>
                </span>
              )}
              {regime.vix != null && (
                <span className="text-dim">
                  VIX: <span className="text-text">{regime.vix.toFixed(1)}</span>
                </span>
              )}
            </div>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green/10 border border-green/30 text-green rounded-lg hover:bg-green/20 transition-colors cursor-pointer text-sm font-medium"
          >
            <Plus size={16} />
            New Thesis
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-[1600px] mx-auto px-8 py-6">
        <Outlet />
      </main>

      {showModal && (
        <NewThesisModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
