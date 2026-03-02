import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, MinusCircle, XCircle } from 'lucide-react';
import { getNews, fetchNews, getNewsPulse } from '../utils/api';

const classIcons = {
  confirming: <CheckCircle size={14} className="text-green" />,
  neutral: <MinusCircle size={14} className="text-amber" />,
  contradicting: <XCircle size={14} className="text-red" />,
};

const classBg = {
  confirming: 'bg-green/10 border-green/20',
  neutral: 'bg-amber/10 border-amber/20',
  contradicting: 'bg-red/10 border-red/20',
};

export default function NewsPulse({ thesisId }) {
  const [articles, setArticles] = useState([]);
  const [pulse, setPulse] = useState(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    loadData();
  }, [thesisId]);

  const loadData = () => {
    getNews(thesisId).then(r => setArticles(r.data)).catch(() => {});
    getNewsPulse(thesisId).then(r => setPulse(r.data.pulse_score)).catch(() => {});
  };

  const handleFetch = async () => {
    setFetching(true);
    try {
      await fetchNews(thesisId);
      loadData();
    } catch {
      // ignore
    }
    setFetching(false);
  };

  const pulseColor = (pulse || 5) > 6 ? 'text-green' : (pulse || 5) < 4 ? 'text-red' : 'text-amber';

  return (
    <div>
      {/* Pulse score header */}
      <div className="bg-card border border-border rounded-xl p-5 mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text">News Pulse Score</h3>
          <p className="text-xs text-dim mt-1">Confirming vs contradicting headlines (30 days)</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-3xl font-bold ${pulseColor}`}>
            {pulse != null ? pulse.toFixed(1) : '-'}
          </span>
          <button
            onClick={handleFetch}
            disabled={fetching}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue/10 text-blue border border-blue/30 rounded-lg hover:bg-blue/20 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={fetching ? 'animate-spin' : ''} />
            {fetching ? 'Fetching...' : 'Fetch News'}
          </button>
        </div>
      </div>

      {/* Headlines */}
      <div className="space-y-2">
        {articles.length === 0 ? (
          <p className="text-sm text-dim text-center py-8">
            No news articles yet. Click "Fetch News" to pull headlines, or configure a NEWS_API_KEY.
          </p>
        ) : (
          articles.map(a => (
            <div key={a.id} className={`border rounded-lg p-3 ${classBg[a.classification] || 'bg-card border-border'}`}>
              <div className="flex items-start gap-2">
                {classIcons[a.classification] || classIcons.neutral}
                <div className="flex-1 min-w-0">
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-text hover:text-green transition-colors no-underline"
                  >
                    {a.title}
                  </a>
                  {a.summary && (
                    <p className="text-[11px] text-dim mt-1">{a.summary}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-dim">
                    {a.source && <span>{a.source}</span>}
                    {a.published_at && (
                      <span>{new Date(a.published_at).toLocaleDateString()}</span>
                    )}
                    <span className={`capitalize font-medium ${a.classification === 'confirming' ? 'text-green' : a.classification === 'contradicting' ? 'text-red' : 'text-amber'}`}>
                      {a.classification}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
