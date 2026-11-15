import { rotationFromPreset } from '@/lib/rotation';
import { createAppStore, loadData } from '@/store/useStore';

import { memoryDocStore } from '../helpers';

// The shared expo-calendar double plus getCalendarPermissionsAsync, which Erase all data uses.
jest.mock('expo-calendar/legacy', () => ({
  requestCalendarPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getCalendarPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true })),
  getCalendarsAsync: jest.fn(async () => []),
  getDefaultCalendarAsync: jest.fn(async () => ({ id: 'default', source: { id: 'src', name: 'Default' } })),
  createCalendarAsync: jest.fn(async () => 'cal-1'),
  createEventAsync: jest.fn(async () => 'evt-1'),
  deleteEventAsync: jest.fn(async () => undefined),
  getEventsAsync: jest.fn(async () => []),
  EntityTypes: { EVENT: 'event' },
  CalendarAccessLevel: { OWNER: 'owner' },
}));

describe('app store', () => {
  it('starts with one default rotation and onboarding not done', () => {
    const db = memoryDocStore();
    const store = createAppStore(db);
    const s = store.getState();
    expect(s.profiles).toHaveLength(1);
    expect(s.settings.onboardingComplete).toBe(false);
    expect(s.meta.isPro).toBe(false);
  });

  it('saves everything and reads it back after a restart', () => {
    const db = memoryDocStore();
    const store = createAppStore(db);
    store.getState().completeOnboarding(rotationFromPreset('48-96', '2027-02-01', null), 'C');
    const extra = store.getState().addProfile('Partner', rotationFromPreset('pitman', '2027-02-01', null), 'B');
    store.getState().addOverride('me', { id: 't1', kind: 'trade', date: '2027-02-10', direction: 'took', counterpart: 'Sam', settled: false });
    store.getState().updateSettings({ showAllPlatoons: true, hour12: false });
    store.getState().toggleOverlay(extra.id);
    store.getState().setPro(true);

    const again = createAppStore(db).getState();
    expect(again.settings.onboardingComplete).toBe(true);
    expect(again.profiles.map((p) => [p.name, p.platoon, p.rotation.presetId])).toEqual([
      ['Me', 'C', '48-96'],
      ['Partner', 'B', 'pitman'],
    ]);
    expect(again.overrides).toHaveLength(1);
    expect(again.overrides[0]).toMatchObject({ id: 't1', profileId: 'me', counterpart: 'Sam' });
    expect(again.settings).toMatchObject({ showAllPlatoons: true, hour12: false, overlayProfileIds: [extra.id] });
    expect(again.meta.isPro).toBe(true);
  });

  it('updates and removes overrides, and bumps the revision so widgets refresh', () => {
    const store = createAppStore(memoryDocStore());
    const r0 = store.getState().revision;
    const o = store.getState().addOverride('me', { id: 'x', kind: 'extra', date: '2027-01-01', category: 'overtime', hours: 4 });
    expect(store.getState().revision).toBe(r0 + 1);
    store.getState().updateOverride(o.id, { id: 'x', kind: 'extra', date: '2027-01-02', category: 'callback', hours: 3 });
    expect(store.getState().overrides[0]).toMatchObject({ date: '2027-01-02', category: 'callback', profileId: 'me' });
    store.getState().removeOverride('x');
    expect(store.getState().overrides).toEqual([]);
  });

  it('removing a profile takes its entries with it and never leaves zero profiles', () => {
    const db = memoryDocStore();
    const store = createAppStore(db);
    const p = store.getState().addProfile('Second job', rotationFromPreset('3-twelves', '2027-01-01', null), 'A');
    store.getState().setActiveProfile(p.id);
    store.getState().addOverride(p.id, { id: 'l', kind: 'leave', date: '2027-01-01', leaveType: 'sick' });
    store.getState().removeProfile(p.id);
    expect(store.getState().profiles).toHaveLength(1);
    expect(store.getState().settings.activeProfileId).toBe('me');
    expect(store.getState().overrides).toEqual([]);
    expect(db.dump().overrides).toEqual({});
    store.getState().removeProfile('me');
    expect(store.getState().profiles).toHaveLength(1);
  });

  it('erase all keeps Pro but resets everything else', () => {
    const db = memoryDocStore();
    const store = createAppStore(db);
    store.getState().completeOnboarding(rotationFromPreset('dupont', '2027-01-01', null), 'D');
    store.getState().setPro(true);
    store.getState().resetAll();
    const s = store.getState();
    expect(s.meta.isPro).toBe(true);
    expect(s.settings.onboardingComplete).toBe(false);
    expect(s.profiles[0]!.rotation.presetId).toBe('24-48');
  });

  it('erase all also takes exported shifts back out of the calendar', async () => {
    const Calendar = jest.requireMock('expo-calendar/legacy') as Record<string, jest.Mock>;
    Calendar.getCalendarPermissionsAsync!.mockResolvedValue({ status: 'granted', granted: true });
    Calendar.deleteEventAsync!.mockClear();
    const store = createAppStore(memoryDocStore());
    store.getState().updateSettings({ calendarExport: { calendarId: 'cal-1', eventIds: ['e1', 'e2'], lastExportAt: '2027-01-01T00:00:00.000Z', monthsAhead: 12 } });
    store.getState().resetAll();
    expect(store.getState().settings.calendarExport.eventIds).toEqual([]);
    await new Promise((r) => setTimeout(r, 0));
    expect(Calendar.deleteEventAsync!.mock.calls.map((c) => c[0])).toEqual(['e1', 'e2']);
  });

  it('erase all still finishes when calendar access is off or the calendar fails', async () => {
    const Calendar = jest.requireMock('expo-calendar/legacy') as Record<string, jest.Mock>;
    Calendar.deleteEventAsync!.mockClear();
    Calendar.getCalendarPermissionsAsync!.mockResolvedValue({ status: 'denied', granted: false });
    const store = createAppStore(memoryDocStore());
    store.getState().updateSettings({ calendarExport: { calendarId: 'cal-1', eventIds: ['e1'], lastExportAt: null, monthsAhead: 12 } });
    store.getState().resetAll();
    await new Promise((r) => setTimeout(r, 0));
    expect(Calendar.deleteEventAsync).not.toHaveBeenCalled();
    expect(store.getState().settings.calendarExport.eventIds).toEqual([]);

    Calendar.getCalendarPermissionsAsync!.mockRejectedValue(new Error('no calendar'));
    store.getState().updateSettings({ calendarExport: { calendarId: 'cal-1', eventIds: ['e2'], lastExportAt: null, monthsAhead: 12 } });
    expect(() => store.getState().resetAll()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(store.getState().settings.onboardingComplete).toBe(false);
    expect(store.getState().settings.calendarExport.eventIds).toEqual([]);
  });

  it('survives unreadable data', () => {
    const db = memoryDocStore();
    db.put('profiles', 'bad', { nope: true });
    db.put('overrides', 'bad', 42);
    db.put('kv', 'settings', { activeProfileId: 'ghost', overlayProfileIds: ['ghost'] });
    const data = loadData(db);
    expect(data.profiles).toHaveLength(1);
    expect(data.overrides).toEqual([]);
    expect(data.settings.activeProfileId).toBe(data.profiles[0]!.id);
    expect(data.settings.overlayProfileIds).toEqual([]);
  });

  it('the real SQLite store reads and writes through expo-sqlite', () => {
    // jest.setup.ts provides an in memory expo-sqlite double that runs the same statements.
    jest.isolateModules(() => {
      const { docStore } = require('@/store/storage.native') as typeof import('@/store/storage.native');
      docStore.put('test', 'a', { b: 1 });
      expect(docStore.get('test', 'a')).toEqual({ b: 1 });
      expect(docStore.all('test')).toEqual([{ id: 'a', value: { b: 1 } }]);
      docStore.remove('test', 'a');
      expect(docStore.get('test', 'a')).toBeNull();
      docStore.put('test', 'c', 1);
      docStore.clear('test');
      expect(docStore.all('test')).toEqual([]);
    });
  });
});
