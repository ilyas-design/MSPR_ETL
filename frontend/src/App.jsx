import {
  BrowserRouter as Router,
  Routes,
  Route,
  NavLink,
  Link,
  useNavigate,
} from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Health from './pages/Health';
import Nutrition from './pages/Nutrition';
import Activity from './pages/Activity';
import Analytics from './pages/Analytics';
import Patients from './pages/Patients';
import Footer from './components/Footer';
import Login from './pages/Login';
import Admin from './pages/Admin';
import { apiService } from './services/api';

const NAV_LINKS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/patients', label: 'Patients' },
  { to: '/health', label: 'Santé' },
  { to: '/nutrition', label: 'Nutrition' },
  { to: '/activity', label: 'Activité' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/admin', label: 'Admin' },
];

function NavAuth() {
  const navigate = useNavigate();
  const [isAuthed, setIsAuthed] = useState(apiService.isAuthenticated());

  useEffect(() => {
    const onStorage = () => setIsAuthed(apiService.isAuthenticated());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo(() => {
    if (isAuthed) {
      return (
        <button
          className="btn btn-secondary btn-sm"
          type="button"
          onClick={() => {
            apiService.logout();
            setIsAuthed(false);
            navigate('/login');
          }}
        >
          Se déconnecter
        </button>
      );
    }
    return (
      <Link className="btn btn-primary btn-sm" to="/login">
        Se connecter
      </Link>
    );
  }, [isAuthed, navigate]);

  return <div className="nav-actions">{actions}</div>;
}

function Nav() {
  const [open, setOpen] = useState(false);
  const closeMenu = () => setOpen(false);

  return (
    <nav className="navbar" aria-label="Navigation principale">
      <div className="nav-container">
        <Link
          to="/"
          className="brand"
          aria-label="MSPR Dashboard"
          onClick={closeMenu}
        >
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>
            <span className="brand-title">MSPR Dashboard</span>
            <span className="brand-sub">Santé &amp; bien-être</span>
          </span>
        </Link>

        <ul
          id="primary-nav"
          className={`nav-menu${open ? ' open' : ''}`}
          role="menubar"
        >
          {NAV_LINKS.map((link) => (
            <li key={link.to} role="none">
              <NavLink
                to={link.to}
                end={link.end}
                role="menuitem"
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <NavAuth />

        <button
          type="button"
          className="nav-toggle"
          aria-controls="primary-nav"
          aria-expanded={open}
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="nav-toggle-bars" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app">
        <Nav />

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/health" element={<Health />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        <Footer />
      </div>
    </Router>
  );
}

export default App;
