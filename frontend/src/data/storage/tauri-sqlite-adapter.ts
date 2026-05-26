import Database from "@tauri-apps/plugin-sql";
import type { StorageAdapter } from "./adapter";

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
  "investments",
  "investment_moves",
  "habitual",
] as const;

export type StoreName = (typeof STORES)[number];

const DB_URL = "sqlite:gestor.db";

let _db: Database | null = null;

async function getDb(): Promise<Database> {
  if (!_db) {
    _db = await Database.load(DB_URL);
  }
  return _db;
}

export class TauriSQLiteAdapter implements StorageAdapter {
  async get<T>(store: string, id: string): Promise<T | undefined> {
    const db = await getDb();
    const rows = await db.select<{ data: string }[]>(
      `SELECT data FROM ${store} WHERE id = ?`,
      [id],
    );
    if (rows.length === 0) return undefined;
    return JSON.parse(rows[0].data) as T;
  }

  async set<T extends object>(store: string, id: string, value: T): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO ${store} (id, data) VALUES (?, ?)`,
      [id, JSON.stringify({ ...value, id })],
    );
  }

  async delete(store: string, id: string): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM ${store} WHERE id = ?`, [id]);
  }

  async list<T>(store: string): Promise<T[]> {
    const db = await getDb();
    const rows = await db.select<{ data: string }[]>(`SELECT data FROM ${store}`);
    return rows.map((r) => JSON.parse(r.data) as T);
  }

  async clear(store: string): Promise<void> {
    const db = await getDb();
    await db.execute(`DELETE FROM ${store}`);
  }

  async clearAll(): Promise<void> {
    const db = await getDb();
    for (const store of STORES) {
      await db.execute(`DELETE FROM ${store}`);
    }
  }
}
