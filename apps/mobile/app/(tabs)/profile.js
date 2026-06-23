import Screen from '../../src/components/Screen';
import HubMenu from '../../src/components/HubMenu';
import Button from '../../src/components/Button';
import { useAuth } from '../../src/auth/AuthContext';
import { USE_MOCKS } from '../../src/config';
import { colors, spacing } from '../../src/theme';
import { Text, StyleSheet, Alert } from 'react-native';

export default function AccountHub() {
  const { profile, signOut } = useAuth();

  function onLogout() {
    Alert.alert('Déconnexion', 'Voulez-vous vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <Screen>
      <Text style={styles.greeting}>@{profile?.username || 'moi'}</Text>
      {USE_MOCKS ? <Text style={styles.mock}>Mode démo hors-ligne</Text> : null}

      <HubMenu
        title="Mon compte"
        subtitle="Profils santé et social, plans sauvegardés."
        items={[
          {
            icon: '🩺',
            title: 'Profil santé',
            subtitle: 'Objectifs, mesures et préférences',
            href: '/health/profile',
          },
          {
            icon: '👤',
            title: 'Profil social',
            subtitle: 'Nom d\'affichage et avatar',
            href: '/account/social',
          },
          {
            icon: '💾',
            title: 'Plans sauvegardés',
            subtitle: 'Repas et programmes IA',
            href: '/plans/saved',
          },
          {
            icon: '➕',
            title: 'Créer une publication',
            subtitle: 'Partager sur le fil social',
            href: '/(tabs)/create',
          },
        ]}
      />

      <Button title="Se déconnecter" variant="danger" onPress={onLogout} style={styles.logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  greeting: { color: colors.textMuted, fontSize: 15 },
  mock: { color: colors.success, fontWeight: '600', fontSize: 13 },
  logout: { marginTop: spacing.md },
});
