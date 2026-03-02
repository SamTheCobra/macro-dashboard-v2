import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ThesisDetail from './pages/ThesisDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/thesis/:id" element={<ThesisDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
