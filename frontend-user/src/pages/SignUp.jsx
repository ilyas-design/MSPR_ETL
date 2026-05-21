import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../services/api';

function SignUp() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
    

        if (password !== passwordConfirm) {
            setError('Les mots de passe ne correspondent pas.');
            return;
        }

        if (password.length < 8 ) {
            setError ('Le mot de passe doit contenir au moins 8 caractères.');
            return;
        }

        setLoading(true);
        try {
            await register(email, password, email);
            navigate('/onboarding', { replace: true});
        } catch (err) {
            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else if (err.code === 'ECONNABORTED') {
                setError('Le serveur ne répond pas. Veuillez réessayer plus tard.');
            } else {
                setError('Une erreur est survenue. Veuillez réessayer.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="login-page">
        <h2>Créer un compte</h2>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-field">
            <label htmlFor="signup-email">Email</label>
            <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                disabled={loading}
            />
            </div>

            <div className="form-field">
            <label htmlFor="signup-password">Mot de passe</label>
            <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                disabled={loading}
                aria-describedby="password-hint"
            />
            <small id="password-hint" className="form-hint">
                Au moins 8 caractères.
            </small>
            </div>

            <div className="form-field">
            <label htmlFor="signup-password-confirm">Confirmer le mot de passe</label>
            <input
                id="signup-password-confirm"
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
            />
            </div>
            {error && (
            <p className="form-error" role="alert">
                {error}
            </p>
            )}

            <button type="submit" disabled={loading}>
            {loading ? 'Création…' : 'Créer mon compte'}
            </button>
        </form>

        <p className="form-footer">
            Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
        </section>
    );
}

export default SignUp 