import type { DocStore } from './storageTypes';

/**
 * The web preview (used for the smoke test and store screenshots) keeps the same
 * documents in localStorage under one key per collection.
 */
const PREFIX = 'rotawise:';

function read(collection: string): Record<string, unknown> {
  try {
    const raw = globalThis.localStorage?.getItem(PREFIX + collection);
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function write(collection: string, value: Record<string, unknown>): void {
  try {
    globalThis.localStorage?.setItem(PREFIX + collection, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app keeps working for this session.
  }
}

export const docStore: DocStore = {
  all(collection) {
    return Object.entries(read(collection)).map(([id, value]) => ({ id, value }));
  },
  get(collection, id) {
    return read(collection)[id] ?? null;
  },
  put(collection, id, value) {
    const all = read(collection);
    all[id] = value;
    write(collection, all);
  },
  remove(collection, id) {
    const all = read(collection);
    delete all[id];
    write(collection, all);
  },
  clear(collection) {
    write(collection, {});
  },
};
