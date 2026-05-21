import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AuthGate from './components/AuthGate';
import Onboarding from './pages/Onboarding';
import Profile from './pages/Profile';
import MealAnalysis from './pages/MealAnalysis';


import { isAuthenticated, logout } from './services/api';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>HealthAI Coach</h1>
        <p>Votre coach santé personnalisé par l'IA</p>
        <Nav />
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<SignUp />} />
          <Route
            path="/dashboard"
            element={
              <AuthGate>
                <Dashboard />
              </AuthGate>
            }
          />
          <Route
            path="/onboarding"
            element={
              <AuthGate>
                <Onboarding />
              </AuthGate>
            }
          />

          <Route
            path="/profile"
            element={
              <AuthGate>
                <Profile />
              </AuthGate>
            }
          />
          <Route
            path="/meal-analysis"
            element={
              <AuthGate>
                <MealAnalysis />
              </AuthGate>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function Nav() {
  const navigate = useNavigate();
  const authed = isAuthenticated();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav>
      <Link to="/">Accueil</Link>
      {authed && (
        <>
          {' | '}
          <Link to="/dashboard">Dashboard</Link>
          {' | '}
          <Link to="/meal-analysis">Analyser un repas</Link>
          {' | '}
          <Link to="/profile">Mon profil</Link>
        </>
      )}
      {' | '}
      {authed ? (
        <button type="button" className="link-button" onClick={handleLogout}>
          Déconnexion
        </button>
      ) : (
        <>
          <Link to="/login">Connexion</Link>
          {' | '}
          <Link to="/register">Inscription</Link>
        </>
      )}
    </nav>
  );
}

function HomePage() {
  const authed = isAuthenticated();

  if (authed) {
    return (
      <section>
        <p>Bienvenue ! Tu es connecté.</p>
        <p>
          <Link to="/dashboard">Accéder à ton tableau de bord →</Link>
        </p>
      </section>
    );
  }

  return (
    <section>
      <p>Bienvenue sur HealthAI Coach.</p>
      <p>Clique sur « Connexion » pour commencer.</p>
    </section>
  );
}

export default App;
