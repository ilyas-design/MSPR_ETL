import { Redirect } from 'expo-router';

/** Point d'entrée `/` — la garde auth est dans app/_layout.js */
export default function Index() {
  return <Redirect href="/(tabs)/dashboard" />;
}
