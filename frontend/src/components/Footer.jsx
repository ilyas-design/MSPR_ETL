import { Link } from 'react-router-dom';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>MSPR Dashboard</span>
        </div>
        <p>
          &copy; {currentYear} MSPR Dashboard — Suivi santé, nutrition et activité
          physique des patients.
        </p>
        <nav className="footer-links" aria-label="Liens légaux">
          <Link to="/accessibilite">Accessibilité : partiellement conforme</Link>
          <a href="#privacy">Confidentialité</a>
          <a href="#terms">Conditions</a>
          <a href="#contact">Contact</a>
        </nav>
      </div>
    </footer>
  );
}

export default Footer;
