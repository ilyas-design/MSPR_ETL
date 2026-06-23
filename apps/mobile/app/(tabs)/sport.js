import Screen from '../../src/components/Screen';
import HubMenu from '../../src/components/HubMenu';

export default function SportHub() {
  return (
    <Screen>
      <HubMenu
        title="Sport"
        subtitle="Programmes IA et suivi de tes séances."
        items={[
          {
            icon: '🏋️',
            title: 'Programme sport IA',
            subtitle: 'Plan d\'entraînement personnalisé',
            href: '/sport/plan',
          },
          {
            icon: '📋',
            title: 'Mes séances',
            subtitle: 'Historique et ajout manuel',
            href: '/sport/history',
          },
          {
            icon: '💾',
            title: 'Plans sauvegardés',
            subtitle: 'Marquer les séances effectuées',
            href: { pathname: '/plans/saved', params: { tab: 'workout' } },
          },
        ]}
      />
    </Screen>
  );
}
