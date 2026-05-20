/**
 * Generic key-value storage interface.
 * All values stored must be plain JSON-serialisable objects.
 * Swap implementations freely (IndexedDB → SQLite, Tauri FS, etc.)
 * without changing any repository or service code.
 */
export interface StorageAdapter {
  get<T>(store: string, id: string): Promise<T | undefined>;
  set<T extends object>(store: string, id: string, value: T): Promise<void>;
  delete(store: string, id: string): Promise<void>;
  list<T>(store: string): Promise<T[]>;
  clear(store: string): Promise<void>;
  clearAll(): Promise<void>;
}
