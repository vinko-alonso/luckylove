import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/context/auth-context';

export default function ProfilesScreen() {
  const { state } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Perfiles</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Tu perfil</ThemedText>
        <ThemedText>Alias: {state.profile?.alias ?? 'Pendiente'}</ThemedText>
        <ThemedText>Email: {state.profile?.email ?? '-'}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Pareja</ThemedText>
        <ThemedText>
          {state.couple?.id ? 'Conectados' : 'Sin conexion'}
        </ThemedText>
        <ThemedText>
          Define metas de estrellas y recompensas para la pareja.
        </ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 16,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
});
