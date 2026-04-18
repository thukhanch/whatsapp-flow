import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WorkflowsPage } from './pages/WorkflowsPage';
import { EditorPage } from './pages/EditorPage';
import { SessionsPage } from './pages/SessionsPage';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <span className="logo-icon">u26a1</span>
            <span>WhatsApp Flow</span>
          </div>
          <nav>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Workflows
            </NavLink>
            <NavLink to="/sessions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Sessu00f5es WhatsApp
            </NavLink>
          </nav>
        </aside>
        <main className="main">
          <Routes>
            <Route path="/" element={<WorkflowsPage />} />
            <Route path="/workflows/:id" element={<EditorPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
