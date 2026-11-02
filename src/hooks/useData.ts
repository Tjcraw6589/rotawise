import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { AppState as RNAppState } from 'react-native';

import type { Profile, StoredOverride } from '@/lib/model';
import { formatMinutes, localISO, localMinutes } from '@/lib/rotation';
import { selectActiveProfile, useStore } from '@/store/useStore';

/** The local date and minute, refreshed every 30 seconds and when the app returns to the foreground. */
export function useNow(): { date: string; minutes: number } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 30_000);
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return { date: localISO(now), minutes: localMinutes(now) };
}

export function useActiveProfile(): Profile {
  return useStore(selectActiveProfile);
}

export function useProfileOverrides(profileId: string): StoredOverride[] {
  const all = useStore((s) => s.overrides);
  return useMemo(() => all.filter((o) => o.profileId === profileId), [all, profileId]);
}

export function useTimeFormat(): (minutes: number) => string {
  const hour12 = useStore((s) => s.settings.hour12);
  return useMemo(() => (m: number) => formatMinutes(m, hour12), [hour12]);
}

export type ProReason = 'trades' | 'overtime' | 'pay' | 'leave' | 'export' | 'profiles' | 'print' | 'themes' | 'widgets' | 'general';

/** `requirePro('trades')` returns true for Pro users and opens the Pro screen for everyone else. */
export function useProGate(): { isPro: boolean; requirePro: (reason: ProReason) => boolean } {
  const isPro = useStore((s) => s.meta.isPro);
  const router = useRouter();
  return {
    isPro,
    requirePro: (reason) => {
      if (isPro) return true;
      router.push({ pathname: '/pro', params: { reason } });
      return false;
    },
  };
}
