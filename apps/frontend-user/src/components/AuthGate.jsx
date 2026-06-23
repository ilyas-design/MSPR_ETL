import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../services/api';

/**
 * Route guard : enveloppe une page privée.
 * Si l'utilisateur n'est pas connecté, redirige vers /login en mémorisant
 * la page d'origine (pour pouvoir y revenir après login).
 */
function AuthGate({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}

export default AuthGate;


