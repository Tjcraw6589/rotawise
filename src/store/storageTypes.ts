export interface DocStore {
  all(collection: string): { id: string; value: unknown }[];
  get(collection: string, id: string): unknown;
  put(collection: string, id: string, value: unknown): void;
  remove(collection: string, id: string): void;
  clear(collection: string): void;
}
