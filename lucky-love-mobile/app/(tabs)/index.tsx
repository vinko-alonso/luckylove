import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function HomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Home</ThemedText>
        <ThemedText>Mensajes, preguntas diarias y recuerdos.</ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Mensaje diario</ThemedText>
        <ThemedText>
          Un mensaje corto para dedicar cada dia.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Pregunta diaria</ThemedText>
        <ThemedText>
          Responde y comparte tu momento favorito.
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Recuerdos</ThemedText>
        <ThemedText>
          Fotos y fechas especiales en un solo lugar.
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
  header: {
    gap: 8,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
});
