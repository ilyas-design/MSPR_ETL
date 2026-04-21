import { usePageTitle } from '../utils/usePageTitle';

/**
 * Déclaration d'accessibilité exigée par la loi française pour les sites
 * publics et recommandée pour tout service (cf. modèle
 * accessibilite.numerique.gouv.fr). Conforme RGAA version 4.
 */
function AccessibilityDeclaration() {
  usePageTitle('Déclaration d\'accessibilité');

  return (
    <div className="page legal-page">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Accessibilité</span>
          <h1>Déclaration d'accessibilité</h1>
          <p className="page-subtitle">
            HealthAI Coach s'engage à rendre son service accessible conformément
            à l'article 47 de la loi n° 2005-102 du 11 février 2005.
          </p>
        </div>
      </header>

      <section className="section" aria-labelledby="a11y-state">
        <h2 id="a11y-state" className="section-title">État de conformité</h2>
        <p>
          Le <em>MSPR Dashboard</em> est <strong>partiellement conforme</strong> au
          <abbr title="Référentiel Général d'Amélioration de l'Accessibilité"> RGAA</abbr>
          {' '}version 4.1, niveau AA. Un audit interne a été réalisé le{' '}
          {new Date().toLocaleDateString('fr-FR')}.
        </p>
      </section>

      <section className="section" aria-labelledby="a11y-tested">
        <h2 id="a11y-tested" className="section-title">Périmètre testé</h2>
        <ul>
          <li>Page de connexion (<code>/login</code>)</li>
          <li>Tableau de bord (<code>/</code>)</li>
          <li>Pages Santé, Nutrition, Activité, Analytics</li>
          <li>Espace administration (<code>/admin</code>) et ses tableaux éditables</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-tech">
        <h2 id="a11y-tech" className="section-title">Technologies utilisées</h2>
        <ul>
          <li>HTML5, CSS3</li>
          <li>JavaScript (React 19, React Router)</li>
          <li>ARIA 1.2 (rôles, propriétés, états)</li>
          <li>Chart.js pour les graphiques (accompagnés de tableaux de données équivalents)</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-nonconform">
        <h2 id="a11y-nonconform" className="section-title">Non-conformités connues</h2>
        <p>
          Les points suivants sont identifiés et seront corrigés dans les
          prochaines itérations :
        </p>
        <ul>
          <li>
            Le contraste de certains libellés secondaires sur fond dégradé
            (critère 3.2) peut être inférieur au ratio 4.5:1 exigé.
          </li>
          <li>
            Les animations de transition (apparition de cartes) ne sont pas
            encore désactivées automatiquement lorsque l'utilisateur a réglé
            <code> prefers-reduced-motion </code>(critère 13.8).
          </li>
          <li>
            Certains messages d'erreur réseau ne précisent pas explicitement la
            nature de l'erreur (critère 11.10).
          </li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-tools">
        <h2 id="a11y-tools" className="section-title">Outils d'évaluation</h2>
        <ul>
          <li>axe DevTools (extension Chrome, Deque Systems)</li>
          <li>Lighthouse (Chrome DevTools)</li>
          <li>Tests clavier manuels (<kbd>Tab</kbd>, <kbd>Shift+Tab</kbd>, <kbd>Entrée</kbd>, <kbd>Échap</kbd>)</li>
          <li>Lecteur d'écran NVDA 2024.3 sous Windows</li>
          <li>ESLint avec le plugin <code>jsx-a11y</code> (intégré au pipeline CI)</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-contact">
        <h2 id="a11y-contact" className="section-title">Retour d'information et contact</h2>
        <p>
          Si vous rencontrez un défaut d'accessibilité vous empêchant d'accéder à
          un contenu ou une fonctionnalité, merci de nous le signaler afin que
          nous puissions apporter une solution :
        </p>
        <ul>
          <li>
            Par courriel :{' '}
            <a href="mailto:accessibilite@healthai-coach.example">
              accessibilite@healthai-coach.example
            </a>
          </li>
        </ul>
        <p>
          Cette réponse vous est adressée en français. Si vous n'obtenez pas de
          réponse satisfaisante, vous avez le droit de faire parvenir vos
          doléances au Défenseur des droits.
        </p>
      </section>

      <section className="section" aria-labelledby="a11y-date">
        <h2 id="a11y-date" className="section-title">Établissement de cette déclaration</h2>
        <p>
          Cette déclaration a été établie le{' '}
          <time dateTime={new Date().toISOString().split('T')[0]}>
            {new Date().toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </time>
          .
        </p>
      </section>
    </div>
  );
}

export default AccessibilityDeclaration;
