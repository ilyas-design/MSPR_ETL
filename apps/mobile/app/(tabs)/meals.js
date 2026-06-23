import Screen from '../../src/components/Screen';
import HubMenu from '../../src/components/HubMenu';

export default function MealsHub() {
  return (
    <Screen>
      <HubMenu
        title="Repas"
        subtitle="Analyse, historique, coach et plans nutritionnels."
        items={[
          {
            icon: '📸',
            title: 'Analyser un repas',
            subtitle: 'Photo de ton assiette → macros',
            href: '/meals/analysis',
          },
          {
            icon: '📋',
            title: 'Historique repas',
            subtitle: 'Tous tes repas enregistrés',
            href: '/meals/history',
          },
          {
            icon: '🧠',
            title: 'Coach nutrition',
            subtitle: 'Recommandations et conseils IA',
            href: '/meals/coach',
          },
          {
            icon: '🍽️',
            title: 'Plan repas IA',
            subtitle: 'Générer un menu personnalisé',
            href: '/meals/plan',
          },
          {
            icon: '💾',
            title: 'Plans sauvegardés',
            subtitle: 'Repas et programmes stockés',
            href: { pathname: '/plans/saved', params: { tab: 'meal' } },
          },
        ]}
      />
    </Screen>
  );
}
