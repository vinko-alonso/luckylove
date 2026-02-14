import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function GoalsScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Goals</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Estrellas</ThemedText>
        <ThemedText>
          Retos con 1-5 estrellas. Se suman cuando ambos completan el reto.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Desafios</ThemedText>
        <ThemedText>Lista de retos pendientes y completados.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Nivel de pareja</ThemedText>
        <ThemedText>
          Aumenta con uso diario, preguntas HOME y canje de beneficios.
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
