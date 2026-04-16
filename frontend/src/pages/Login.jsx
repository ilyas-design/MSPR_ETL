import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiService.login(username, password);
      const next = location.state?.next || '/admin';
      navigate(next);
    } catch {
      setError("Identifiants invalides ou serveur indisponible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="auth-shell">
        <div className="auth-card" role="region" aria-label="Connexion">
          <div className="auth-header">
            <h2>Connexion</h2>
            <p>Accès requis pour corriger des anomalies et exporter les données.</p>
          </div>

          <form onSubmit={onSubmit} className="form">
            <div className="field">
              <label className="label" htmlFor="username">Nom d'utilisateur</label>
              <input
                id="username"
                className="input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error ? <div className="error" role="alert">{error}</div> : null}

            <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <div className="auth-footnote">
            <span className="muted">
              Utilisez un compte Django (ex: superuser) configuré côté backend.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

