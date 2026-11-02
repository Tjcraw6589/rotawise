import { AppState as RNAppState } from 'react-native';

import { buildSnapshot } from '@/lib/widgetSnapshot';
import { localISO } from '@/lib/rotation';
import { overridesFor, selectActiveProfile, useStore } from '@/store/useStore';

import { publishWidgetSnapshot } from './widgets';

let lastKey = '';

/** Build and publish a fresh snapshot if anything (or the date) changed since the last one. */
export function syncWidgets(force = false): void {
  const s = useStore.getState();
  const profile = selectActiveProfile(s);
  const today = localISO();
  const background = s.meta.isPro ? s.settings.widgetBackground : 'system';
  const key = `${s.revision}|${today}|${profile.id}|${background}|${s.settings.hour12}`;
  if (!force && key === lastKey) return;
  lastKey = key;
  publishWidgetSnapshot(buildSnapshot({ profile, overrides: overridesFor(s, profile.id), today, hour12: s.settings.hour12, background }));
}

/** Keeps widgets current: on every change, and each time the app comes to the foreground. */
export function startWidgetSync(): () => void {
  syncWidgets(true);
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.revision !== prev.revision || state.settings.widgetBackground !== prev.settings.widgetBackground || state.settings.hour12 !== prev.settings.hour12) syncWidgets();
  });
  const sub = RNAppState.addEventListener('change', (next) => {
    if (next === 'active') syncWidgets();
  });
  return () => {
    unsubscribe();
    sub.remove();
  };
}
