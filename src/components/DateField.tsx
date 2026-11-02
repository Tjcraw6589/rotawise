import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MONTH_NAMES, addMonths, formatLongDate, localISO, monthGrid, parseISO, toISO } from '@/lib/rotation';
import { selectionHaptic } from '@/services/haptics';
import { useTheme } from '@/theme/useTheme';

import { AppText } from './AppText';
import { Button } from './Button';
import { Sheet } from './Sheet';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  helper?: string;
  testID?: string;
}

/** A tappable field that opens a built in month picker. Works the same on iOS, Android and web. */
export function DateField({ label, value, onChange, helper, testID }: DateFieldProps) {
  const { colors, radius, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <AppText variant="small" tone="muted" style={{ marginBottom: spacing.xs }}>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${formatLongDate(value)}`}
        onPress={() => setOpen(true)}
        testID={testID}
        style={[styles.field, { backgroundColor: colors.input, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md }]}
      >
        <AppText variant="body" style={styles.flex}>
          {formatLongDate(value)}, {value.slice(0, 4)}
        </AppText>
        <Ionicons name="calendar-outline" size={20} color={colors.textMuted} />
      </Pressable>
      {helper ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
          {helper}
        </AppText>
      ) : null}
      <Sheet visible={open} onClose={() => setOpen(false)} title={label} testID={testID ? `${testID}-sheet` : undefined}>
        <MonthPicker
          key={`${value}-${open}`}
          value={value}
          onPick={(d) => {
            onChange(d);
            setOpen(false);
          }}
          testID={testID}
        />
      </Sheet>
    </View>
  );
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function MonthPicker({ value, onPick, testID }: { value: string; onPick: (iso: string) => void; testID?: string }) {
  const { colors, radius, spacing } = useTheme();
  const [cursor, setCursor] = useState(() => toISO({ ...parseISO(value), day: 1 }));
  const c = parseISO(cursor);
  const weeks = monthGrid(c.year, c.month, 0);
  const today = localISO();
  return (
    <View style={{ paddingHorizontal: spacing.lg }}>
      <View style={styles.monthRow}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={12} onPress={() => setCursor(addMonths(cursor, -1))} testID={testID ? `${testID}-prev` : undefined}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <AppText variant="h3">
          {MONTH_NAMES[c.month - 1]} {c.year}
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Next month" hitSlop={12} onPress={() => setCursor(addMonths(cursor, 1))} testID={testID ? `${testID}-next` : undefined}>
          <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
      </View>
      <View style={styles.grid}>
        {WEEKDAYS.map((w, i) => (
          <View key={`${w}${i}`} style={styles.cell}>
            <AppText variant="small" tone="faint">
              {w}
            </AppText>
          </View>
        ))}
        {weeks.flat().map((d, i) => {
          if (!d) return <View key={`e${i}`} style={styles.cell} />;
          const selected = d === value;
          const isToday = d === today;
          return (
            <Pressable
              key={d}
              accessibilityRole="button"
              accessibilityLabel={formatLongDate(d)}
              accessibilityState={{ selected }}
              onPress={() => {
                selectionHaptic();
                onPick(d);
              }}
              testID={testID ? `${testID}-day-${d}` : undefined}
              style={styles.cell}
            >
              <View style={[styles.day, { borderRadius: radius.pill }, selected && { backgroundColor: colors.primary }, !selected && isToday && { borderWidth: 2, borderColor: colors.primary }]}>
                <AppText variant="bodyBold" style={{ color: selected ? colors.onPrimary : colors.text }}>
                  {Number(d.slice(8))}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={{ marginTop: spacing.md }}>
        <Button label="Today" variant="secondary" size="sm" onPress={() => onPick(today)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1 },
  flex: { flex: 1 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', justifyContent: 'center', paddingVertical: 3 },
  day: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
});
