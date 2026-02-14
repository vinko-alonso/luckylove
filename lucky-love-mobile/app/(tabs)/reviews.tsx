import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { withAlpha } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function ReviewsScreen() {
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const background = useThemeColor({}, 'background');

  const items = [
    { id: 'rnd-1', score: '8.6' },
    { id: 'rnd-2', score: '9.1' },
    { id: 'rnd-3', score: '7.8' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="title">Resenas</ThemedText>

      <ThemedView style={styles.card}>
        <ThemedText type="subtitle">Resenas destacadas</ThemedText>
        <View style={styles.reviewGrid}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[styles.reviewTile, { backgroundColor: withAlpha(border, 0.2) }]}>
              <View style={[styles.reviewScore, { backgroundColor: tint }]}>
                <ThemedText
                  type="defaultSemiBold"
                  style={[styles.reviewScoreText, { color: background }]}>
                  {item.score}
                </ThemedText>
              </View>
            </View>
          ))}
        </View>
        <Button label="Ver resenas" variant="secondary" onPress={() => {}} />
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
    gap: 12,
  },
  reviewGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  reviewTile: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: 'hidden',
  },
  reviewScore: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewScoreText: {
  },
});
