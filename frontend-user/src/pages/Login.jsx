import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { login } from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect.');
      } else if (err.code === 'ECONNABORTED') {
        setError('La requête a pris trop de temps. Réessaie.');
      } else {
        setError('Une erreur est survenue. Réessaie plus tard.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page" aria-labelledby="auth-title">
      <div className="auth-bg" aria-hidden="true" />

      <div className="auth-card">
        <header className="auth-card-header">
          <div className="auth-brand">
            <span className="auth-brand-logo" aria-hidden="true">🌿</span>
            <span className="auth-brand-name">HealthAI Coach</span>
          </div>
          <h1 id="auth-title" className="auth-title">Bon retour</h1>
          <p className="auth-subtitle">
            Connecte-toi pour continuer ton suivi.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="prenom@exemple.com"
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Mot de passe</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <p className="auth-error" role="alert">{error}</p>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="auth-footer-link">
          Pas encore de compte ?{' '}
          <Link to="/register">Crée le tien</Link>
        </p>
      </div>
    </section>
  );
}

export default Login;
