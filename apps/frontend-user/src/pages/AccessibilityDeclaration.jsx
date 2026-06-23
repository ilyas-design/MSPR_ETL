/**
 * Déclaration d'accessibilité — application utilisateur HealthAI Coach (MSPR2).
 * Modèle inspiré de accessibilite.numerique.gouv.fr · RGAA 4.1.
 */
function AccessibilityDeclaration() {
  const auditDate = '11 juin 2026';

  return (
    <div className="legal-page">
      <header className="page-header">
        <span className="page-eyebrow">Accessibilité</span>
        <h1>Déclaration d&apos;accessibilité</h1>
        <p className="page-subtitle">
          L&apos;application utilisateur HealthAI Coach (port 81) s&apos;engage à
          rendre son service accessible conformément à l&apos;article 47 de la loi
          n° 2005-102 du 11 février 2005.
        </p>
      </header>

      <section className="section" aria-labelledby="a11y-state">
        <h2 id="a11y-state" className="section-title">État de conformité</h2>
        <p>
          Cette application est <strong>partiellement conforme</strong> au{' '}
          <abbr title="Référentiel Général d'Amélioration de l'Accessibilité">
            RGAA
          </abbr>{' '}
          version 4.1, niveau AA. Un audit interne automatisé (axe + ESLint jsx-a11y)
          et des tests clavier ont été réalisés le {auditDate}.
        </p>
        <p>
          <strong>Nous ne revendiquons pas une certification AA complète</strong>{' '}
          : des écarts subsistent (voir ci-dessous) et l&apos;audit n&apos;a pas
          couvert l&apos;intégralité des parcours utilisateur.
        </p>
      </section>

      <section className="section" aria-labelledby="a11y-tested">
        <h2 id="a11y-tested" className="section-title">Périmètre testé</h2>
        <ul>
          <li>Connexion (<code>/login</code>) et inscription (<code>/register</code>)</li>
          <li>Analyse photo de repas (<code>/meal-analysis</code>)</li>
          <li>Onboarding (<code>/onboarding</code>) et profil (<code>/profile</code>)</li>
          <li>Tableau de bord (<code>/dashboard</code>) et coach nutritionnel (<code>/coach</code>)</li>
          <li>Plan de repas IA (<code>/meal-plan</code>) et plan d&apos;entraînement IA (<code>/workout-plan</code>)</li>
          <li>Plans sauvegardés (<code>/saved-plans</code>) et historique des séances (<code>/workout-history</code>)</li>
          <li>Navigation principale (menus Repas / Sport)</li>
        </ul>
        <p className="muted">
          Chaque page testée fait l&apos;objet d&apos;un test axe-core automatisé
          (Vitest), soit 10 pages. Seule la page d&apos;accueil publique n&apos;a pas
          encore de test axe dédié.
        </p>
      </section>

      <section className="section" aria-labelledby="a11y-tech">
        <h2 id="a11y-tech" className="section-title">Technologies utilisées</h2>
        <ul>
          <li>HTML5, CSS3, JavaScript (React 19, React Router, Vite)</li>
          <li>ARIA 1.2 (rôles, états, libellés)</li>
          <li>Chart.js avec tableaux de données textuelles équivalents sur Dashboard et Coach</li>
          <li>Lien d&apos;évitement « Aller au contenu principal »</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-nonconform">
        <h2 id="a11y-nonconform" className="section-title">Non-conformités et écarts connus</h2>
        <ul>
          <li>
            <strong>Graphiques Chart.js (critères 1.1 / 1.3)</strong> : un résumé textuel
            et un tableau masqué visuellement accompagnent les graphiques principaux, mais
            l&apos;interaction canvas reste limitée au pointeur.
          </li>
          <li>
            <strong>Emojis décoratifs</strong> : utilisés dans les titres et cartes ;
            la plupart sont marqués <code>aria-hidden</code> ou doublés d&apos;un libellé,
            mais pas systématiquement sur toutes les pages.
          </li>
          <li>
            <strong>Messages d&apos;erreur réseau (critère 11.10)</strong> : parfois
            génériques (« une erreur est survenue ») sans détail actionnable.
          </li>
        </ul>
        <h3 className="section-subtitle">Écarts corrigés lors du dernier audit</h3>
        <ul>
          <li>
            <strong>Contraste (critère 3.2)</strong> : le jeton de texte secondaire le
            plus clair a été assombri (stone-500) pour atteindre un ratio ≥ 4,5:1 sur
            fond clair.
          </li>
          <li>
            <strong>Animations (critère 13.8)</strong> : un bloc{' '}
            <code>@media (prefers-reduced-motion: reduce)</code> neutralise désormais
            transitions, animations et défilements animés.
          </li>
          <li>
            <strong>Upload de fichiers (critère 10.1)</strong> : l&apos;<code>input
            type=&quot;file&quot;</code> est masqué visuellement mais reste focusable au
            clavier, avec un anneau de focus visible sur la zone de dépôt.
          </li>
          <li>
            <strong>Barres de progression (critère 7.1)</strong> : ajout d&apos;un nom
            accessible (<code>aria-label</code>) sur l&apos;indicateur de calories et
            correction d&apos;une valeur <code>aria-valuenow</code> invalide
            (<code>NaN</code>) quand la cible nutritionnelle est nulle.
          </li>
          <li>
            <strong>Ordre des titres (critère 9.1)</strong> : hiérarchie corrigée sur
            le tableau de bord et le coach (h1 → h2 → h3 sans saut de niveau).
          </li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-tools">
        <h2 id="a11y-tools" className="section-title">Outils d&apos;évaluation</h2>
        <ul>
          <li>axe-core via jest-axe (tests Vitest sur 10 pages)</li>
          <li>ESLint <code>eslint-plugin-jsx-a11y</code> (règles critiques en erreur, CI)</li>
          <li>Tests clavier manuels (Tab, Entrée, Échap sur menus)</li>
          <li>Lighthouse accessibilité (Chrome DevTools)</li>
        </ul>
      </section>

      <section className="section" aria-labelledby="a11y-contact">
        <h2 id="a11y-contact" className="section-title">Contact</h2>
        <p>
          Signalez un problème d&apos;accessibilité à{' '}
          <a href="mailto:accessibilite@healthai-coach.example">
            accessibilite@healthai-coach.example
          </a>
          . Réponse en français sous 30 jours ouvrés (objectif projet académique).
        </p>
      </section>

      <section className="section" aria-labelledby="a11y-date">
        <h2 id="a11y-date" className="section-title">Date de la déclaration</h2>
        <p>
          Établie le{' '}
          <time dateTime="2026-06-11">{auditDate}</time>.
        </p>
      </section>
    </div>
  );
}

export default AccessibilityDeclaration;
