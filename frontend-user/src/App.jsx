import { Routes, Route, Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AuthGate from './components/AuthGate';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import MealAnalysis from './pages/MealAnalysis';
import MealHistory from './pages/History';
import Coach from './pages/Coach';
import MealPlan from './pages/MealPlan';
import SavedPlans from './pages/SavedPlans';
import WorkoutPlan from './pages/WorkoutPlan';
import WorkoutHistory from './pages/WorkoutHistory';
import AccessibilityDeclaration from './pages/AccessibilityDeclaration';
import { isAuthenticated, logout } from './services/api';
import './App.css';

function App() {
  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      <AppHeader />

      <main id="main-content" className="app-main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/accessibilite" element={<AccessibilityDeclaration />} />
          <Route path="/dashboard" element={<AuthGate><Dashboard /></AuthGate>} />
          <Route path="/onboarding" element={<AuthGate><Onboarding /></AuthGate>} />
          <Route path="/profile" element={<AuthGate><Profile /></AuthGate>} />
          <Route path="/meal-analysis" element={<AuthGate><MealAnalysis /></AuthGate>} />
          <Route path="/historique" element={<AuthGate><MealHistory /></AuthGate>} />
          <Route path="/coach" element={<AuthGate><Coach /></AuthGate>} />
          <Route path="/meal-plan" element={<AuthGate><MealPlan /></AuthGate>} />
          <Route path="/saved-plans" element={<AuthGate><SavedPlans /></AuthGate>} />
          <Route path="/workout-plan" element={<AuthGate><WorkoutPlan /></AuthGate>} />
          <Route path="/workout-history" element={<AuthGate><WorkoutHistory /></AuthGate>} />
        </Routes>
      </main>

      <AppFooter />
    </div>
  );
}

function AppHeader() {
  const navigate = useNavigate();
  const authed = isAuthenticated();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="app-header" role="banner">
      <div className="app-header-inner">
        {/* Logo + tagline */}
        <Link to={authed ? '/dashboard' : '/'} className="brand" aria-label="Accueil HealthAI Coach">
          <span className="brand-logo" aria-hidden="true">🌿</span>
          <span className="brand-text">
            <span className="brand-name">HealthAI</span>
            <span className="brand-suffix">Coach</span>
          </span>
        </Link>

        {/* Navigation principale (avec dropdowns Repas / Sport) */}
        {authed && (
          <nav className="main-nav" aria-label="Navigation principale">
            <NavItem to="/dashboard">Dashboard</NavItem>

            <NavDropdown
              label="Repas"
              icon="🍽️"
              matchPaths={['/meal-analysis', '/coach', '/meal-plan', '/historique']}
              extraMatch={(loc) => loc.pathname === '/saved-plans' && loc.search.includes('meal')}
              items={[
                { to: '/meal-analysis', icon: '📷', label: 'Analyser un repas', desc: 'Photo → macros par IA' },
                { to: '/coach', icon: '🧠', label: 'Coach nutrition', desc: 'Conseils personnalisés' },
                { to: '/meal-plan', icon: '✨', label: 'Plan repas IA', desc: 'Génère un menu sur mesure' },
                { to: '/saved-plans?tab=meal', icon: '💾', label: 'Plans sauvegardés', desc: 'Tes menus enregistrés' },
                { to: '/historique', icon: '📔', label: 'Historique', desc: 'Tes repas mangés' },
              ]}
            />

            <NavDropdown
              label="Sport"
              icon="🏋️"
              matchPaths={['/workout-plan', '/workout-history']}
              extraMatch={(loc) => loc.pathname === '/saved-plans' && loc.search.includes('workout')}
              items={[
                { to: '/workout-plan', icon: '✨', label: 'Générer un programme', desc: 'Plan d\'entraînement IA' },
                { to: '/saved-plans?tab=workout', icon: '💾', label: 'Programmes sauvegardés', desc: 'Tes plans hebdo' },
                { to: '/workout-history', icon: '💪', label: 'Mes séances', desc: 'Historique des entraînements' },
              ]}
            />
          </nav>
        )}

        {/* Actions utilisateur (droite) */}
        <div className="user-actions">
          {authed ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `nav-avatar ${isActive ? 'active' : ''}`
                }
                aria-label="Mon profil"
                title="Mon profil"
              >
                👤
              </NavLink>
              <button
                type="button"
                className="button-secondary nav-logout"
                onClick={handleLogout}
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-pill">Connexion</Link>
              <Link to="/register" className="button-link">Inscription</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
    >
      {children}
    </NavLink>
  );
}

function NavDropdown({ label, icon, items, matchPaths = [], extraMatch }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const location = useLocation();

  // État actif : si on est sur l'un des paths du groupe
  const isActive =
    matchPaths.some((path) => location.pathname.startsWith(path)) ||
    (extraMatch ? extraMatch(location) : false);

  // Ferme au click extérieur ou Échap (RGAA 7.3 / WCAG 2.1.2 — focus rendu au déclencheur)
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  // Ferme aussi au changement de route
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  return (
    <div
      ref={dropdownRef}
      className={`nav-dropdown ${open ? 'open' : ''} ${isActive ? 'active' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="nav-item nav-dropdown-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`nav-menu-${label.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        <span className="nav-dropdown-chevron" aria-hidden="true">▾</span>
      </button>

      <div
        className="nav-dropdown-menu"
        role="menu"
        id={`nav-menu-${label.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <div className="nav-dropdown-header" aria-hidden="true">
          <span className="nav-dropdown-icon">{icon}</span>
          <span className="nav-dropdown-title">{label}</span>
        </div>
        <ul className="nav-dropdown-list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive: itemActive }) =>
                  `nav-dropdown-item ${itemActive ? 'active' : ''}`
                }
                role="menuitem"
              >
                <span className="nav-dropdown-item-icon" aria-hidden="true">{item.icon}</span>
                <span className="nav-dropdown-item-text">
                  <span className="nav-dropdown-item-label">{item.label}</span>
                  {item.desc && (
                    <span className="nav-dropdown-item-desc">{item.desc}</span>
                  )}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="app-footer" role="contentinfo">
      <p>
        © {new Date().getFullYear()} HealthAI Coach — Projet MSPR2 EPSI ·{' '}
        <Link to="/">Accueil</Link>
        {' · '}
        <Link to="/accessibilite">Accessibilité</Link>
      </p>
    </footer>
  );
}

function HomePage() {
  const authed = isAuthenticated();

  if (authed) {
    return (
      <section className="home-page">
        <div className="home-hero">
          <h2>Bon retour parmi nous 👋</h2>
          <p className="muted">
            Continue ton suivi nutritionnel et sportif personnalisé par l'IA.
          </p>
          <Link to="/dashboard" className="button-link">
            Accéder à mon tableau de bord →
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="home-page">
      <div className="home-hero">
        <h2>Ton coach santé personnel, propulsé par l'IA</h2>
        <p className="muted">
          Analyse photo de tes repas, plans nutritionnels et programmes d'entraînement
          générés sur mesure par notre IA. Suis tes objectifs avec des recommandations
          adaptées à ton profil.
        </p>
        <div className="home-cta">
          <Link to="/register" className="button-link">
            Commencer gratuitement
          </Link>
          <Link to="/login" className="nav-pill">
            J'ai déjà un compte →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default App;
