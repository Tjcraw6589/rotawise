import type { Profile, StoredOverride } from '@/lib/model';

export const calendarExportSupported = false;

export interface CalendarChoice {
  id: string;
  title: string;
  account: string;
}

export async function listWritableCalendars(): Promise<CalendarChoice[] | null> {
  return [];
}

export interface ExportResult {
  ok: boolean;
  message: string;
  calendarId: string | null;
  eventIds: string[];
}

export async function exportShiftsToCalendar(args: {
  profile: Profile;
  overrides: StoredOverride[];
  monthsAhead: number;
  previousCalendarId: string | null;
  previousEventIds: string[];
}): Promise<ExportResult> {
  return { ok: false, message: 'Calendar export works in the iPhone and Android apps.', calendarId: args.previousCalendarId, eventIds: args.previousEventIds };
}
