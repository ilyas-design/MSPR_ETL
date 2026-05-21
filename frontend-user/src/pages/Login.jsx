import { useState } from 'react'
import { useNavigate, useLocation, Link} from 'react-router-dom';
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
        <section className="login-page">
      <h2>Connexion</h2>

      <form onSubmit={handleSubmit} className="login-form">
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="form-field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={loading}>
          {loading ? 'Connexion en cours...' : 'Se connecter'}
        </button>
      </form>
      <p className="signup-link">
        Pas encore de compte ? <Link to="/register">Inscris-toi ici</Link>.
      </p>
    </section>
    );
}

export default Login;

