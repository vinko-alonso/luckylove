import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { addDays, endOfMonth, format, getDay, isSameDay, startOfMonth } from 'date-fns';
import { useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

const CALENDAR_PADDING = 12;
const CELL_WIDTH_PERCENT = `${100 / 7}%`;

type DayMeta = {
  prints?: number;
  checks?: number;
  photos?: number;
  photoUrls?: string[];
  starCount?: number;
};

type CalendarProps = {
  monthDate: Date; // Asegúrate de pasar new Date() desde el padre para el mes actual
  selectedDate?: Date | null;
  dayMeta?: Record<string, DayMeta>;
  onSelectDate?: (date: Date) => void;
};

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export function Calendar({ monthDate, selectedDate, dayMeta = {}, onSelectDate }: any) {
  const colorScheme = useColorScheme() ?? 'light';
  const border = useThemeColor({}, 'border');
  const tint = useThemeColor({}, 'tint');
  const surface = useThemeColor({}, 'surface');
  const text = useThemeColor({}, 'text');
  const background = useThemeColor({}, 'background');
  const link = useThemeColor({}, 'link');

  const labelColor = colorScheme === 'light' ? background : text;
  const labelShadowColor =
    colorScheme === 'light' ? withAlpha(text, 0.6) : withAlpha(background, 0.6);
  const overlayColor = withAlpha(text, 0.2);

  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const dayOfWeek = getDay(monthStart);
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const totalCells = Math.ceil((offset + monthEnd.getDate()) / 7) * 7;

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const date = addDays(monthStart, i - offset);
    return {
      date,
      isInMonth: date.getMonth() === monthStart.getMonth(),
      key: i,
    };
  });

  return (
    <View style={[styles.calendar, { borderColor: border }]}>
      {/* HEADER: Días de la semana */}
      <View style={styles.row}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <View key={i} style={[styles.headerCell, { width: CELL_WIDTH_PERCENT }]}>
            <ThemedText style={styles.weekLabel}>{d}</ThemedText>
          </View>
        ))}
      </View>

      {/* GRID: Usamos flexWrap en lugar de mapear filas para forzar la grilla */}
      <View style={styles.grid}>
        {cells.map(({ date, isInMonth, key }) => {
          const isSelected = selectedDate ? isSameDay(selectedDate, date) : false;
          const dayKey = format(date, 'yyyy-MM-dd');
          const meta = dayMeta[dayKey];

          return (
            <DayCell
              key={key}
              date={date}
              isInMonth={isInMonth}
              isSelected={isSelected}
              meta={meta}
              border={border}
              tint={tint}
              surface={surface}
              labelColor={labelColor}
              labelShadowColor={labelShadowColor}
              spinnerColor={labelColor}
              checkColor={link}
              overlayColor={overlayColor}
              onSelectDate={onSelectDate}
            />
          );
        })}
      </View>
    </View>
  );
}

function DayCell({
  date,
  isInMonth,
  isSelected,
  meta,
  border,
  tint,
  surface,
  labelColor,
  labelShadowColor,
  spinnerColor,
  checkColor,
  overlayColor,
  onSelectDate,
}: {
  date: Date;
  isInMonth: boolean;
  isSelected: boolean;
  meta?: DayMeta;
  border: string;
  tint: string;
  surface: string;
  labelColor: string;
  labelShadowColor: string;
  spinnerColor: string;
  checkColor: string;
  overlayColor: string;
  onSelectDate?: (date: Date) => void;
}) {
  const [loading, setLoading] = useState(false);
  const photoUrl = meta?.photoUrls?.[0] ?? null;
  const starCount = Number(meta?.starCount ?? 0);
  const starColor = photoUrl ? labelColor : tint;

  return (
    <Pressable
      onPress={() => isInMonth && onSelectDate?.(date)}
      style={[
        styles.dayCell,
        {
          width: CELL_WIDTH_PERCENT,
          aspectRatio: 1,
          borderColor: isSelected ? tint : border,
          backgroundColor: isSelected ? surface : 'transparent',
          // Si no es del mes, lo hacemos invisible pero mantenemos el espacio
          opacity: isInMonth ? 1 : 0,
          borderWidth: isInMonth ? 1 : 0,
        },
      ]}>
      {isInMonth && (
        <>
          {photoUrl ? (
            <Image
              source={{ uri: photoUrl }}
              style={styles.dayPhoto}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
          ) : null}
          {photoUrl && loading ? (
            <View style={[styles.dayLoader, { backgroundColor: overlayColor }]}>
              <ActivityIndicator size="small" color={spinnerColor} />
            </View>
          ) : null}
          <View style={styles.dayContent}>
            <View style={styles.dayLabelRow}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  photoUrl
                    ? [
                        styles.dayLabelOnPhoto,
                        { color: labelColor, textShadowColor: labelShadowColor },
                      ]
                    : null,
                ]}>
                {format(date, 'd')}
              </ThemedText>
              {starCount > 0 ? (
                <View style={styles.starCountRow}>
                  <IconSymbol name="star.fill" size={10} color={starColor} />
                  <ThemedText
                    style={[
                      styles.starCountText,
                      photoUrl
                        ? [
                            styles.dayLabelOnPhoto,
                            { color: labelColor, textShadowColor: labelShadowColor },
                          ]
                        : { color: starColor },
                    ]}>
                    {starCount}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <View style={styles.markerRow}>
              {meta?.prints && <View style={[styles.marker, { backgroundColor: tint }]} />}
              {meta?.checks && <View style={[styles.marker, { backgroundColor: checkColor }]} />}
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  calendar: {
    width: '100%',
    padding: CALENDAR_PADDING,
    borderWidth: 1,
    borderRadius: 16,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap', // Esto fuerza que los hijos se acomoden en grilla
    width: '100%',
  },
  headerCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    opacity: 0.5,
  },
  dayCell: {
    padding: 4,
    justifyContent: 'space-between',
    borderRadius: 8,
    marginVertical: 2, // Un pequeño espacio para que no se peguen
    overflow: 'hidden',
  },
  dayPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  dayLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  starCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starCountText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dayLabelOnPhoto: {
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  markerRow: {
    flexDirection: 'row',
    gap: 2,
  },
  marker: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});