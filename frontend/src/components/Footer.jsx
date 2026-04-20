function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-content">
        <div className="footer-brand">
          <span className="brand-mark" aria-hidden="true">M</span>
          <span>MSPR Dashboard</span>
        </div>
        <p>
          &copy; {currentYear} MSPR Dashboard — Suivi santé, nutrition et activité
          physique des patients.
        </p>
        <div className="footer-links">
          <a href="#privacy">Confidentialité</a>
          <a href="#terms">Conditions</a>
          <a href="#contact">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
