import type { StorageAdapter } from "./adapter";

const DB_NAME = "caderneta_v1";
const DB_VERSION = 1;

export const STORES = [
  "cards",
  "statements",
  "transactions",
  "categories",
  "category_rules",
  "budgets",
  "goals",
  "recurring",
  "imports",
  "settings",
] as const;

export type StoreName = (typeof STORES)[number];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as IDBDatabase);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
  });
}

function txOp<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const tr = db.transaction(store, mode);
    const req = fn(tr.objectStore(store));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

export class IDBStorageAdapter implements StorageAdapter {
  private readonly dbPromise: Promise<IDBDatabase>;

  constructor() {
    if (typeof indexedDB === "undefined") {
      // Running in SSR / non-browser environment — reject gracefully
      this.dbPromise = Promise.reject(new Error("IndexedDB is not available (SSR)"));
    } else {
      this.dbPromise = openDB();
    }
  }

  async get<T>(store: string, id: string): Promise<T | undefined> {
    const db = await this.dbPromise;
    return txOp<T | undefined>(db, store, "readonly", (s) => s.get(id));
  }

  async set<T extends object>(store: string, id: string, value: T): Promise<void> {
    const db = await this.dbPromise;
    // Always ensure the stored record carries its key so IDB keyPath "id" is satisfied.
    const stored = { ...value, id };
    await txOp<IDBValidKey>(db, store, "readwrite", (s) => s.put(stored));
  }

  async delete(store: string, id: string): Promise<void> {
    const db = await this.dbPromise;
    await txOp<undefined>(db, store, "readwrite", (s) => s.delete(id));
  }

  async list<T>(store: string): Promise<T[]> {
    const db = await this.dbPromise;
    return new Promise<T[]>((resolve, reject) => {
      const tr = db.transaction(store, "readonly");
      const req = tr.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result as T[]);
      req.onerror = () => reject(req.error);
    });
  }

  async clear(store: string): Promise<void> {
    const db = await this.dbPromise;
    await txOp<undefined>(db, store, "readwrite", (s) => s.clear());
  }

  async clearAll(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise<void>((resolve, reject) => {
      const tr = db.transaction([...STORES], "readwrite");
      let pending = STORES.length;
      const done = () => {
        if (--pending === 0) resolve();
      };
      tr.onerror = () => reject(tr.error);
      for (const name of STORES) {
        const req = tr.objectStore(name).clear();
        req.onsuccess = done;
        req.onerror = () => reject(req.error);
      }
    });
  }
}
