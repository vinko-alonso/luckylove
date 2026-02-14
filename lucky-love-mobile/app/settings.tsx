import { useLocalSearchParams } from 'expo-router';

import { SettingsView } from '@/components/settings-view';

export default function SettingsScreen() {
  const params = useLocalSearchParams();
  const codeParam = typeof params.code === 'string' ? params.code : undefined;

  return <SettingsView spotifyCode={codeParam} />;
}
