import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Theses
export const getTheses = (status = 'active') => api.get(`/theses?status=${status}`);
export const getThesis = (id) => api.get(`/theses/${id}`);
export const createThesis = (title) => api.post('/theses', { title });
export const updateThesis = (id, data) => api.put(`/theses/${id}`, data);
export const deleteThesis = (id) => api.delete(`/theses/${id}`);

// Tree
export const getTree = (thesisId) => api.get(`/theses/${thesisId}/tree`);
export const getTreeFlat = (thesisId) => api.get(`/theses/${thesisId}/tree/flat`);

// Conviction
export const getConviction = (thesisId) => api.get(`/theses/${thesisId}/conviction`);
export const addConviction = (thesisId, data) => api.post(`/theses/${thesisId}/conviction`, data);

// Evidence
export const getEvidence = (thesisId) => api.get(`/theses/${thesisId}/evidence`);

// News
export const getNews = (thesisId) => api.get(`/theses/${thesisId}/news`);
export const fetchNews = (thesisId) => api.post(`/theses/${thesisId}/news/fetch`);
export const getNewsPulse = (thesisId) => api.get(`/theses/${thesisId}/news/pulse`);

// Bets
export const getBets = (thesisId) => api.get(`/theses/${thesisId}/bets`);
export const createBet = (thesisId, data) => api.post(`/theses/${thesisId}/bets`, data);
export const updateBet = (betId, data) => api.put(`/bets/${betId}`, data);
export const deleteBet = (betId) => api.delete(`/bets/${betId}`);

// Macro regime
export const getMacroRegime = () => api.get('/regime/current');

// Health
export const healthCheck = () => api.get('/health');

export default api;
