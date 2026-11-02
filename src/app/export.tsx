import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { AppText } from '@/components/AppText';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Header } from '@/components/Header';
import { Notice } from '@/components/Notice';
import { OptionSheet } from '@/components/OptionSheet';
import { Row } from '@/components/Row';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { Stepper } from '@/components/Stepper';
import { useActiveProfile, useProfileOverrides } from '@/hooks/useData';
import { type CalendarChoice, calendarExportSupported, exportShiftsToCalendar, listWritableCalendars } from '@/services/calendarExport';
import { successHaptic } from '@/services/haptics';
import { useStore } from '@/store/useStore';
import { useTheme } from '@/theme/useTheme';

const NEW_KEY = '__new__';

export default function ExportScreen() {
  const { spacing } = useTheme();
  const profile = useActiveProfile();
  const overrides = useProfileOverrides(profile.id);
  const state = useStore((s) => s.settings.calendarExport);
  const updateSettings = useStore((s) => s.updateSettings);
  const [calendars, setCalendars] = useState<CalendarChoice[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!calendarExportSupported) return;
    void listWritableCalendars().then((list) => {
      if (list) setCalendars(list);
    });
  }, []);

  const chosen = calendars.find((c) => c.id === state.calendarId);

  const run = async () => {
    setBusy(true);
    try {
      const r = await exportShiftsToCalendar({
        profile,
        overrides,
        monthsAhead: state.monthsAhead,
        previousCalendarId: state.calendarId,
        previousEventIds: state.eventIds,
      });
      if (r.ok) {
        updateSettings({ calendarExport: { ...state, calendarId: r.calendarId, eventIds: r.eventIds, lastExportAt: new Date().toISOString() } });
        successHaptic();
      }
      setResult({ ok: r.ok, message: r.message });
    } catch {
      setResult({ ok: false, message: 'The shifts could not be added. Check calendar access in Settings and try again.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll testID="export-screen">
      <Header title="Share with a calendar" dismiss="back" />
      <AppText variant="body" tone="muted">
        Rotawise adds your working shifts to a calendar on this phone. Share that calendar with a partner and they see your rotation in their own calendar app.
      </AppText>
      {!calendarExportSupported ? (
        <Notice tone="info" message="Calendar export works in the iPhone and Android apps." testID="export-unsupported" />
      ) : null}

      <SectionHeader title="Settings" />
      <Card padded={false}>
        <Row title="Calendar" value={chosen ? chosen.title : 'New "Rotawise shifts"'} onPress={() => setPicker(true)} testID="export-calendar" />
        <Row title="Shifts for" value={`${state.monthsAhead} months`} last />
      </Card>
      <Stepper
        label="Months ahead"
        value={state.monthsAhead}
        min={1}
        max={24}
        onChange={(n) => updateSettings({ calendarExport: { ...state, monthsAhead: n } })}
        testID="export-months"
      />
      <Button label={state.lastExportAt ? 'Update calendar' : 'Add shifts to calendar'} size="lg" fullWidth loading={busy} disabled={!calendarExportSupported} onPress={() => void run()} testID="export-run" />
      {result ? (
        <Notice tone={result.ok ? 'success' : 'warning'} message={result.message} testID="export-result" />
      ) : state.lastExportAt ? (
        <AppText variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
          Last updated {new Date(state.lastExportAt).toLocaleString()}. Updating replaces the earlier events, so trades and leave stay current.
        </AppText>
      ) : null}

      <SectionHeader title="How a partner sees it" />
      <AppText variant="body" tone="muted">
        {Platform.OS === 'android'
          ? 'Pick your Google calendar above, then on calendar.google.com open that calendar\'s settings and choose "Share with specific people".'
          : 'On iPhone, open the Calendar app, tap Calendars, tap the info button next to "Rotawise shifts" (or the calendar you picked) and tap Add Person. It needs to be an iCloud calendar.'}
      </AppText>

      <OptionSheet<string>
        visible={picker}
        onClose={() => setPicker(false)}
        title="Calendar"
        value={state.calendarId ?? NEW_KEY}
        options={[{ key: NEW_KEY, label: 'New "Rotawise shifts" calendar' }, ...calendars.map((c) => ({ key: c.id, label: c.title, sublabel: c.account }))]}
        onSelect={(k) => updateSettings({ calendarExport: { ...state, calendarId: k === NEW_KEY ? null : k } })}
        testID="export-picker"
      />
    </Screen>
  );
}
