import type { Profile, Settings, StoredOverride } from '@/lib/model';
import { defaultProfile, defaultSettings } from '@/lib/model';
import type { DocStore } from '@/store/storageTypes';
import { useStore } from '@/store/useStore';

/** In memory DocStore for store tests. */
export function memoryDocStore(): DocStore & { dump(): Record<string, Record<string, unknown>> } {
  const data: Record<string, Record<string, unknown>> = {};
  const col = (c: string) => (data[c] ??= {});
  return {
    all: (c) => Object.entries(col(c)).map(([id, value]) => ({ id, value: JSON.parse(JSON.stringify(value)) as unknown })),
    get: (c, id) => (col(c)[id] === undefined ? null : (JSON.parse(JSON.stringify(col(c)[id])) as unknown)),
    put: (c, id, value) => {
      col(c)[id] = JSON.parse(JSON.stringify(value)) as unknown;
    },
    remove: (c, id) => {
      delete col(c)[id];
    },
    clear: (c) => {
      data[c] = {};
    },
    dump: () => data,
  };
}

/** Reset the app store to a known state for screen tests. */
export function resetStore(opts: { onboardingComplete?: boolean; isPro?: boolean; profile?: Profile; overrides?: StoredOverride[]; settings?: Partial<Settings> } = {}): void {
  const profile = opts.profile ?? defaultProfile('2027-01-01');
  useStore.setState({
    profiles: [profile],
    overrides: opts.overrides ?? [],
    settings: { ...defaultSettings(), activeProfileId: profile.id, onboardingComplete: opts.onboardingComplete ?? true, ...opts.settings },
    meta: { isPro: opts.isPro ?? false, installedAt: '2027-01-01T00:00:00.000Z' },
    revision: 0,
  });
}
