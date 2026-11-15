import * as Calendar from 'expo-calendar/legacy';
import { Platform } from 'react-native';

import { shiftEvents } from '@/lib/calendarEvents';
import type { Profile, StoredOverride } from '@/lib/model';
import { addDays, addMonths, localISO, parseISO } from '@/lib/rotation';
import type { ISODate } from '@/lib/rotation';

export const calendarExportSupported = true;

export interface ExportResult {
  ok: boolean;
  message: string;
  calendarId: string | null;
  eventIds: string[];
}

const CALENDAR_TITLE = 'Rotawise shifts';
/** Every exported event's notes start with this (see shiftEvents), so leftovers can be found again. */
const EXPORT_NOTE_PREFIX = 'Added by Rotawise';

function localMidnight(date: ISODate): Date {
  const d = parseISO(date);
  return new Date(d.year, d.month - 1, d.day);
}

async function deleteEvents(ids: readonly string[]): Promise<void> {
  for (const id of ids) {
    try {
      await Calendar.deleteEventAsync(id);
    } catch {
      // Already deleted by the user; nothing to do.
    }
  }
}

/**
 * Finds events Rotawise added to its own "Rotawise shifts" calendar, even when their IDs were lost
 * (after Erase all data or a reinstall). Only that calendar is read, and only events with our note.
 */
async function findOurEvents(calendarId: string, from: Date, to: Date): Promise<string[]> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    if (!calendars.some((c) => c.id === calendarId && c.title === CALENDAR_TITLE)) return [];
    const events = await Calendar.getEventsAsync([calendarId], from, to);
    return events.filter((e) => typeof e.notes === 'string' && e.notes.startsWith(EXPORT_NOTE_PREFIX)).map((e) => e.id);
  } catch {
    return [];
  }
}

/**
 * Removes the shifts a previous export added, for Erase all data. Best effort: it never asks for
 * calendar access and never throws, so erasing always goes ahead.
 */
export async function removeExportedEvents(eventIds: readonly string[]): Promise<void> {
  try {
    if (eventIds.length === 0) return;
    const permission = await Calendar.getCalendarPermissionsAsync();
    if (!permission.granted) return;
    await deleteEvents(eventIds);
  } catch {
    // Calendar unavailable; the user can still delete the events in their Calendar app.
  }
}

export interface CalendarChoice {
  id: string;
  title: string;
  account: string;
}

/** Calendars the user can write to, for example an iCloud or Google calendar that is already shared. */
export async function listWritableCalendars(): Promise<CalendarChoice[] | null> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) return null;
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  return calendars
    .filter((c) => c.allowsModifications)
    .map((c) => ({ id: c.id, title: c.title, account: c.source?.name ?? '' }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

async function findOrCreateCalendar(existingId: string | null): Promise<string> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (existingId && calendars.some((c) => c.id === existingId && c.allowsModifications)) return existingId;
  const ours = calendars.find((c) => c.title === CALENDAR_TITLE && c.allowsModifications);
  if (ours) return ours.id;
  if (Platform.OS === 'ios') {
    const defaultCalendar = await Calendar.getDefaultCalendarAsync();
    return Calendar.createCalendarAsync({
      title: CALENDAR_TITLE,
      color: '#005A8C',
      entityType: Calendar.EntityTypes.EVENT,
      sourceId: defaultCalendar.source.id,
      source: defaultCalendar.source,
      name: CALENDAR_TITLE,
      ownerAccount: 'personal',
      accessLevel: Calendar.CalendarAccessLevel.OWNER,
    });
  }
  return Calendar.createCalendarAsync({
    title: CALENDAR_TITLE,
    color: '#005A8C',
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: 'Rotawise', type: 'LOCAL' },
    name: CALENDAR_TITLE,
    ownerAccount: 'Rotawise',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
}

/**
 * Adds the next N months of shifts to a "Rotawise shifts" calendar on the device,
 * replacing the events from the previous export. Share that calendar (or the account it
 * lives in) with a partner to let them see your rotation.
 */
export async function exportShiftsToCalendar(args: {
  profile: Profile;
  overrides: StoredOverride[];
  monthsAhead: number;
  previousCalendarId: string | null;
  previousEventIds: string[];
}): Promise<ExportResult> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (!permission.granted) {
    return { ok: false, message: 'Calendar access is off. Turn it on for Rotawise in Settings to export shifts.', calendarId: args.previousCalendarId, eventIds: args.previousEventIds };
  }
  const calendarId = await findOrCreateCalendar(args.previousCalendarId);
  await deleteEvents(args.previousEventIds);
  const today = localISO();
  const from = addDays(today, -1);
  const to = addMonths(today, args.monthsAhead);
  // Leftovers from an export whose IDs were lost would otherwise show up twice.
  await deleteEvents(await findOurEvents(calendarId, localMidnight(from), localMidnight(addDays(to, 2))));
  let timeZone = 'UTC';
  try {
    timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // Fallback handled in shiftEvents.
  }
  const events = shiftEvents(args.profile, args.overrides, from, to, timeZone);
  const eventIds: string[] = [];
  for (const e of events) {
    const id = await Calendar.createEventAsync(calendarId, { title: e.title, startDate: e.start, endDate: e.end, notes: e.notes, timeZone });
    eventIds.push(id);
  }
  return { ok: true, message: `Added ${events.length} shifts to the "${CALENDAR_TITLE}" calendar.`, calendarId, eventIds };
}
