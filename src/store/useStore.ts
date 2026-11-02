import { create } from 'zustand';

import type { Meta, Profile, Settings, StoredOverride } from '@/lib/model';
import { DEFAULT_PROFILE_ID, PROFILE_COLORS, defaultProfile, defaultSettings, newId } from '@/lib/model';
import type { Override, Platoon, Rotation } from '@/lib/rotation';

import { docStore } from './storage';
import type { DocStore } from './storageTypes';

export const STORE_VERSION = 1;

export interface AppState {
  profiles: Profile[];
  overrides: StoredOverride[];
  settings: Settings;
  meta: Meta;
  /** Bumped on every change that affects what widgets show. */
  revision: number;

  completeOnboarding(rotation: Rotation, platoon: Platoon): void;
  setRotation(profileId: string, rotation: Rotation, platoon: Platoon): void;
  setPlatoon(profileId: string, platoon: Platoon): void;
  addProfile(name: string, rotation: Rotation, platoon: Platoon): Profile;
  updateProfile(id: string, patch: Partial<Pick<Profile, 'name' | 'color'>>): void;
  removeProfile(id: string): void;
  setActiveProfile(id: string): void;
  toggleOverlay(id: string): void;
  addOverride(profileId: string, override: Override): StoredOverride;
  updateOverride(id: string, override: Override): void;
  removeOverride(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  setPro(isPro: boolean): void;
  resetAll(): void;
}

type Data = Pick<AppState, 'profiles' | 'overrides' | 'settings' | 'meta'>;

const C = { profiles: 'profiles', overrides: 'overrides', kv: 'kv' } as const;

/** Read everything from storage. Falls back to defaults for anything missing or unreadable. */
export function loadData(store: DocStore): Data {
  let profiles: Profile[] = [];
  let overrides: StoredOverride[] = [];
  let settings = defaultSettings();
  let meta: Meta = { isPro: false, installedAt: new Date().toISOString() };
  try {
    profiles = store
      .all(C.profiles)
      .map((r) => r.value as Profile)
      .filter((p) => p && typeof p.id === 'string' && p.rotation && Array.isArray(p.rotation.cycle))
      .sort((a, b) => (a.id === DEFAULT_PROFILE_ID ? -1 : b.id === DEFAULT_PROFILE_ID ? 1 : a.createdAt.localeCompare(b.createdAt)));
    overrides = store
      .all(C.overrides)
      .map((r) => r.value as StoredOverride)
      .filter((o) => o && typeof o.id === 'string' && typeof o.date === 'string');
    const savedSettings = store.get(C.kv, 'settings') as Partial<Settings> | null;
    if (savedSettings) settings = { ...settings, ...savedSettings, leave: { ...settings.leave, ...savedSettings.leave }, calendarExport: { ...settings.calendarExport, ...savedSettings.calendarExport } };
    const savedMeta = store.get(C.kv, 'meta') as Partial<Meta> | null;
    if (savedMeta) meta = { ...meta, ...savedMeta };
    else store.put(C.kv, 'meta', meta);
  } catch {
    // A corrupt database should never stop the app from opening.
  }
  if (profiles.length === 0) {
    profiles = [defaultProfile()];
    settings = { ...settings, onboardingComplete: false };
  }
  if (!profiles.some((p) => p.id === settings.activeProfileId)) settings = { ...settings, activeProfileId: profiles[0]!.id };
  settings = { ...settings, overlayProfileIds: settings.overlayProfileIds.filter((id) => profiles.some((p) => p.id === id) && id !== settings.activeProfileId) };
  return { profiles, overrides, settings, meta };
}

export function createAppStore(store: DocStore) {
  const initial = loadData(store);
  return create<AppState>()((set, get) => {
    const saveSettings = (settings: Settings) => store.put(C.kv, 'settings', settings);
    const saveProfile = (p: Profile) => store.put(C.profiles, p.id, p);
    const bump = () => get().revision + 1;

    return {
      ...initial,
      revision: 0,

      completeOnboarding(rotation, platoon) {
        const active = get().settings.activeProfileId;
        const profiles = get().profiles.map((p) => (p.id === active ? { ...p, rotation, platoon } : p));
        profiles.forEach(saveProfile);
        const settings = { ...get().settings, onboardingComplete: true };
        saveSettings(settings);
        set({ profiles, settings, revision: bump() });
      },

      setRotation(profileId, rotation, platoon) {
        const profiles = get().profiles.map((p) => (p.id === profileId ? { ...p, rotation, platoon } : p));
        profiles.filter((p) => p.id === profileId).forEach(saveProfile);
        set({ profiles, revision: bump() });
      },

      setPlatoon(profileId, platoon) {
        const profiles = get().profiles.map((p) => (p.id === profileId ? { ...p, platoon } : p));
        profiles.filter((p) => p.id === profileId).forEach(saveProfile);
        set({ profiles, revision: bump() });
      },

      addProfile(name, rotation, platoon) {
        const used = new Set(get().profiles.map((p) => p.color));
        const color = PROFILE_COLORS.find((c) => !used.has(c)) ?? PROFILE_COLORS[get().profiles.length % PROFILE_COLORS.length]!;
        const profile: Profile = { id: newId('p'), name: name.trim() || 'Rotation', color, rotation, platoon, createdAt: new Date().toISOString() };
        saveProfile(profile);
        set({ profiles: [...get().profiles, profile], revision: bump() });
        return profile;
      },

      updateProfile(id, patch) {
        const profiles = get().profiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
        profiles.filter((p) => p.id === id).forEach(saveProfile);
        set({ profiles, revision: bump() });
      },

      removeProfile(id) {
        const { profiles, overrides, settings } = get();
        if (profiles.length <= 1) return;
        store.remove(C.profiles, id);
        const removedOverrides = overrides.filter((o) => o.profileId === id);
        removedOverrides.forEach((o) => store.remove(C.overrides, o.id));
        const left = profiles.filter((p) => p.id !== id);
        const nextSettings: Settings = {
          ...settings,
          activeProfileId: settings.activeProfileId === id ? left[0]!.id : settings.activeProfileId,
          overlayProfileIds: settings.overlayProfileIds.filter((x) => x !== id),
        };
        saveSettings(nextSettings);
        set({ profiles: left, overrides: overrides.filter((o) => o.profileId !== id), settings: nextSettings, revision: bump() });
      },

      setActiveProfile(id) {
        const settings = { ...get().settings, activeProfileId: id, overlayProfileIds: get().settings.overlayProfileIds.filter((x) => x !== id) };
        saveSettings(settings);
        set({ settings, revision: bump() });
      },

      toggleOverlay(id) {
        const current = get().settings.overlayProfileIds;
        const overlayProfileIds = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
        const settings = { ...get().settings, overlayProfileIds };
        saveSettings(settings);
        set({ settings });
      },

      addOverride(profileId, override) {
        const stored = { ...override, profileId, createdAt: new Date().toISOString() } as StoredOverride;
        store.put(C.overrides, stored.id, stored);
        set({ overrides: [...get().overrides, stored], revision: bump() });
        return stored;
      },

      updateOverride(id, override) {
        const overrides = get().overrides.map((o) => (o.id === id ? ({ ...override, id, profileId: o.profileId, createdAt: o.createdAt } as StoredOverride) : o));
        const updated = overrides.find((o) => o.id === id);
        if (updated) store.put(C.overrides, id, updated);
        set({ overrides, revision: bump() });
      },

      removeOverride(id) {
        store.remove(C.overrides, id);
        set({ overrides: get().overrides.filter((o) => o.id !== id), revision: bump() });
      },

      updateSettings(patch) {
        const settings = { ...get().settings, ...patch };
        saveSettings(settings);
        set({ settings, revision: bump() });
      },

      setPro(isPro) {
        if (get().meta.isPro === isPro) return;
        const meta = { ...get().meta, isPro };
        store.put(C.kv, 'meta', meta);
        set({ meta, revision: bump() });
      },

      resetAll() {
        store.clear(C.profiles);
        store.clear(C.overrides);
        const isPro = get().meta.isPro;
        store.clear(C.kv);
        const meta = { isPro, installedAt: get().meta.installedAt };
        store.put(C.kv, 'meta', meta);
        const fresh = loadData(store);
        set({ ...fresh, meta, revision: bump() });
      },
    };
  });
}

export const useStore = createAppStore(docStore);

/** The profile the app is showing. */
export function selectActiveProfile(s: AppState): Profile {
  return s.profiles.find((p) => p.id === s.settings.activeProfileId) ?? s.profiles[0]!;
}

export function overridesFor(s: Pick<AppState, 'overrides'>, profileId: string): StoredOverride[] {
  return s.overrides.filter((o) => o.profileId === profileId);
}
