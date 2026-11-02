import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

import type { DocStore } from './storageTypes';

/**
 * All app data lives in one SQLite table of JSON documents keyed by collection and id.
 * Every call is synchronous, so the store can hydrate before the first render.
 */
let db: SQLiteDatabase | null = null;

function database(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync('rotawise.db');
    db.execSync(
      'PRAGMA journal_mode = WAL; CREATE TABLE IF NOT EXISTS docs (collection TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (collection, id));',
    );
  }
  return db;
}

export const docStore: DocStore = {
  all(collection) {
    const rows = database().getAllSync<{ id: string; json: string }>('SELECT id, json FROM docs WHERE collection = ?', [collection]);
    return rows.map((r) => ({ id: r.id, value: JSON.parse(r.json) as unknown }));
  },
  get(collection, id) {
    const row = database().getFirstSync<{ id: string; json: string }>('SELECT id, json FROM docs WHERE collection = ? AND id = ?', [collection, id]);
    return row ? (JSON.parse(row.json) as unknown) : null;
  },
  put(collection, id, value) {
    database().runSync('INSERT OR REPLACE INTO docs (collection, id, json, updated_at) VALUES (?, ?, ?, ?)', [collection, id, JSON.stringify(value), new Date().toISOString()]);
  },
  remove(collection, id) {
    database().runSync('DELETE FROM docs WHERE collection = ? AND id = ?', [collection, id]);
  },
  clear(collection) {
    database().runSync('DELETE FROM docs WHERE collection = ?', [collection]);
  },
};
