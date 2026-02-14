import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function DatesScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Dates</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Calendario</ThemedText>
        <ThemedText>Agrega fechas especiales con fotos y musica.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Proximas fechas</ThemedText>
        <ThemedText>Resumen de las proximas celebraciones.</ThemedText>
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
