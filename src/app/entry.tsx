import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { DateField } from '@/components/DateField';
import { Header } from '@/components/Header';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Stepper } from '@/components/Stepper';
import { TextField } from '@/components/TextField';
import { useActiveProfile, useTimeFormat } from '@/hooks/useData';
import { formatHours } from '@/lib/format';
import { defaultShiftHours, newId } from '@/lib/model';
import type { ExtraOverride, LeaveOverride, Override, TradeOverride } from '@/lib/rotation';
import { effectiveShifts, isWorking, localISO } from '@/lib/rotation';
import { successHaptic } from '@/services/haptics';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

type Kind = 'trade' | 'extra' | 'leave';

/** Add or edit a trade, an overtime entry or a day of leave. */
export default function EntryScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; date?: string; id?: string }>();
  const existing = useStore((s) => s.overrides.find((o) => o.id === params.id));
  const active = useActiveProfile();
  const profile = useStore((s) => (existing ? (s.profiles.find((p) => p.id === existing.profileId) ?? active) : active));
  const addOverride = useStore((s) => s.addOverride);
  const updateOverride = useStore((s) => s.updateOverride);
  const removeOverride = useStore((s) => s.removeOverride);
  const formatTime = useTimeFormat();
  const shiftHours = defaultShiftHours(profile);

  const [kind, setKind] = useState<Kind>((existing?.kind ?? (params.kind as Kind | undefined)) || 'trade');
  const [date, setDate] = useState(existing?.date ?? params.date ?? localISO());
  const [direction, setDirection] = useState<TradeOverride['direction']>(existing?.kind === 'trade' ? existing.direction : 'gave');
  const [counterpart, setCounterpart] = useState(existing?.kind === 'trade' ? existing.counterpart : '');
  const [settled, setSettled] = useState(existing?.kind === 'trade' ? existing.settled : false);
  const [category, setCategory] = useState<ExtraOverride['category']>(existing?.kind === 'extra' ? existing.category : 'overtime');
  const [startMinutes, setStartMinutes] = useState(existing?.kind === 'extra' ? (existing.startMinutes ?? profile.rotation.shiftTypes[0]?.startMinutes ?? 420) : (profile.rotation.shiftTypes[0]?.startMinutes ?? 420));
  const [leaveType, setLeaveType] = useState<LeaveOverride['leaveType']>(existing?.kind === 'leave' ? existing.leaveType : 'vacation');
  const [hours, setHours] = useState<number>(existing && 'hours' in existing && existing.hours !== undefined ? existing.hours : existing?.kind === 'extra' ? existing.hours : kind === 'extra' ? 12 : shiftHours);
  const [note, setNote] = useState(existing?.note ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const scheduledThatDay = effectiveShifts(profile.rotation, profile.platoon, date, date).filter(isWorking);
  const warning =
    kind === 'trade' && direction === 'gave' && scheduledThatDay.length === 0
      ? "You aren't scheduled this day, so there is no shift to give away."
      : kind === 'leave' && scheduledThatDay.length === 0
        ? "You aren't scheduled this day. Leave only changes days you work."
        : kind === 'trade' && direction === 'took' && scheduledThatDay.length > 0
          ? 'You are already scheduled this day. The traded shift is added on top.'
          : null;

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const build = (): Override => {
    const id = existing?.id ?? newId(kind);
    const base = { id, date, ...(note.trim() ? { note: note.trim() } : {}) };
    if (kind === 'trade') return { ...base, kind: 'trade', direction, counterpart: counterpart.trim(), hours, settled };
    if (kind === 'extra') return { ...base, kind: 'extra', category, startMinutes, hours };
    return { ...base, kind: 'leave', leaveType, hours: leaveType === 'kelly' ? undefined : hours };
  };

  const save = () => {
    const o = build();
    if (existing) updateOverride(existing.id, o);
    else addOverride(profile.id, o);
    successHaptic();
    close();
  };

  return (
    <Screen
      scroll
      edges={['top', 'bottom']}
      testID="entry-screen"
      footer={
        <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>
          <Button label="Save" size="lg" fullWidth onPress={save} disabled={kind === 'trade' && counterpart.trim() === ''} testID="entry-save" />
        </View>
      }
    >
      <Header title={existing ? 'Edit entry' : 'New entry'} dismiss="close" />
      {!existing ? (
        <View style={{ marginBottom: spacing.lg }}>
          <SegmentedControl
            options={[
              { key: 'trade', label: 'Trade' },
              { key: 'extra', label: 'Overtime' },
              { key: 'leave', label: 'Leave' },
            ]}
            value={kind}
            onChange={(k) => {
              setKind(k);
              setHours(k === 'extra' ? 12 : shiftHours);
            }}
            testID="entry-kind"
          />
        </View>
      ) : null}
      <DateField label="Date" value={date} onChange={setDate} testID="entry-date" />
      {warning ? (
        <AppText variant="caption" tone="warning" style={{ marginTop: -spacing.sm, marginBottom: spacing.md }} testID="entry-warning">
          {warning}
        </AppText>
      ) : null}

      {kind === 'trade' ? (
        <>
          <SegmentedControl
            options={[
              { key: 'gave', label: 'They work my shift' },
              { key: 'took', label: 'I work theirs' },
            ]}
            value={direction}
            onChange={setDirection}
            testID="entry-direction"
          />
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm, marginBottom: spacing.lg }} testID="entry-trade-hint">
            {direction === 'gave'
              ? 'This day comes off your calendar and you owe them the time. Your pay stays the same.'
              : 'This shift goes on your calendar and they owe you the time. It is not added to your pay.'}
          </AppText>
          <TextField label="Traded with" placeholder="Name" value={counterpart} onChangeText={setCounterpart} maxLength={40} testID="entry-counterpart" />
        </>
      ) : null}

      {kind === 'extra' ? (
        <>
          <SegmentedControl
            options={[
              { key: 'overtime', label: 'Overtime' },
              { key: 'extra-shift', label: 'Extra shift' },
              { key: 'callback', label: 'Callback' },
              { key: 'training', label: 'Training' },
            ]}
            value={category}
            onChange={setCategory}
            testID="entry-category"
          />
          <View style={{ height: spacing.lg }} />
          <Stepper label="Starts at" value={startMinutes} display={formatTime(startMinutes)} step={30} min={0} max={1410} onChange={setStartMinutes} testID="entry-start" />
        </>
      ) : null}

      {kind === 'leave' ? (
        <>
          <SegmentedControl
            options={[
              { key: 'vacation', label: 'Vacation' },
              { key: 'sick', label: 'Sick' },
              { key: 'kelly', label: 'Kelly' },
              { key: 'other', label: 'Other' },
            ]}
            value={leaveType}
            onChange={setLeaveType}
            testID="entry-leave-type"
          />
          <View style={{ height: spacing.lg }} />
        </>
      ) : null}

      {!(kind === 'leave' && leaveType === 'kelly') ? (
        <Stepper label="Hours" value={hours} display={formatHours(hours)} step={0.5} min={0.5} max={72} onChange={setHours} testID="entry-hours" />
      ) : null}

      {kind === 'trade' ? (
        <Card padded={false} style={{ marginBottom: spacing.lg }}>
          <Row title="Paid back" subtitle="Turn on when the favor has been returned" toggle={{ value: settled, onValueChange: setSettled }} last testID="entry-settled" />
        </Card>
      ) : null}

      <TextField label="Note" placeholder="Optional" value={note} onChangeText={setNote} maxLength={200} testID="entry-note" />

      {existing ? <Button label="Delete entry" variant="danger" fullWidth onPress={() => setConfirmDelete(true)} testID="entry-delete" /> : null}
      <ConfirmSheet
        visible={confirmDelete}
        title="Delete this entry?"
        message="Your calendar goes back to the regular rotation for this day."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (existing) removeOverride(existing.id);
          setConfirmDelete(false);
          close();
        }}
        onCancel={() => setConfirmDelete(false)}
        testID="entry-delete-sheet"
      />
    </Screen>
  );
}
