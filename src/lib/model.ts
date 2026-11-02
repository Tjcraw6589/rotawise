import type { LeaveAllowance, Override, PaySettings, Platoon, Rotation } from './rotation';
import { localISO, rotationFromPreset } from './rotation';

/** One person's rotation. Pro users can keep several (a second job, a spouse) and overlay them. */
export interface Profile {
  id: string;
  name: string;
  /** Overlay color used when this profile is shown on top of another. */
  color: string;
  rotation: Rotation;
  platoon: Platoon;
  createdAt: string;
}

export type StoredOverride = Override & { profileId: string; createdAt: string };

export type ThemePreference = 'system' | 'light' | 'dark';
export type PaletteId = 'station' | 'engine' | 'midnight' | 'forest' | 'graphite';
export type WidgetBackground = 'system' | 'light' | 'dark' | 'platoon';

export interface CalendarExportState {
  calendarId: string | null;
  eventIds: string[];
  lastExportAt: string | null;
  monthsAhead: number;
}

export interface Settings {
  theme: ThemePreference;
  palette: PaletteId;
  weekStartsOn: 0 | 1;
  hour12: boolean;
  /** Month view: every platoon, or just mine. */
  showAllPlatoons: boolean;
  activeProfileId: string;
  overlayProfileIds: string[];
  onboardingComplete: boolean;
  pay: PaySettings | null;
  leave: LeaveAllowance;
  widgetBackground: WidgetBackground;
  calendarExport: CalendarExportState;
}

export interface Meta {
  isPro: boolean;
  installedAt: string;
}

export const DEFAULT_PROFILE_ID = 'me';

export const PROFILE_COLORS = ['#0072B2', '#CC79A7', '#56B4E9', '#E69F00', '#009E73', '#D55E00'] as const;

export function defaultProfile(today: string = localISO()): Profile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Me',
    color: PROFILE_COLORS[0],
    rotation: rotationFromPreset('24-48', today, null),
    platoon: 'A',
    createdAt: new Date(0).toISOString(),
  };
}

export function defaultSettings(): Settings {
  return {
    theme: 'system',
    palette: 'station',
    weekStartsOn: 0,
    hour12: true,
    showAllPlatoons: false,
    activeProfileId: DEFAULT_PROFILE_ID,
    overlayProfileIds: [],
    onboardingComplete: false,
    pay: null,
    leave: { vacationHours: 0, sickHours: 0, kellyDays: 0 },
    widgetBackground: 'system',
    calendarExport: { calendarId: null, eventIds: [], lastExportAt: null, monthsAhead: 12 },
  };
}

export function defaultPaySettings(today: string = localISO()): PaySettings {
  return {
    kind: 'biweekly',
    anchorStart: today,
    paydayOffsetDays: 6,
    hourlyRate: 0,
    regularHoursPerPeriod: 106,
    otMultiplier: 1.5,
  };
}

/** Free users keep one rotation. */
export const FREE_PROFILE_LIMIT = 1;

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Hours in the profile's main shift, used when a trade or leave entry has no hours of its own. */
export function defaultShiftHours(profile: Profile): number {
  const first = profile.rotation.shiftTypes[0];
  return first ? first.durationMinutes / 60 : 24;
}

/** Move every shift type in a rotation to a new start time, keeping day and night 12 hours apart. */
export function withStartTime(rotation: Rotation, startMinutes: number): Rotation {
  const first = rotation.shiftTypes[0];
  if (!first) return rotation;
  const delta = startMinutes - first.startMinutes;
  return {
    ...rotation,
    shiftTypes: rotation.shiftTypes.map((t) => ({ ...t, startMinutes: (((t.startMinutes + delta) % 1440) + 1440) % 1440 })),
  };
}
