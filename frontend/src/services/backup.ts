import type { BackupData } from "../domain/types";
import { db } from "../data/db";
import { defaultSettings } from "../data/seed";

const BACKUP_VERSION = 1;

/** Reads all data from storage and returns it serialised as a JSON string. */
export async function exportAppData(): Promise<string> {
  const [
    cards,
    statements,
    transactions,
    categories,
    categoryRules,
    goals,
    recurringEntries,
    importJobs,
    settings,
  ] = await Promise.all([
    db.cards.list(),
    db.statements.list(),
    db.transactions.list(),
    db.categories.list(),
    db.categoryRules.list(),
    db.goals.list(),
    db.recurring.list(),
    db.imports.list(),
    db.settings.get(),
  ]);

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    cards,
    statements,
    transactions,
    categories,
    categoryRules,
    goals,
    recurringEntries,
    importJobs,
    settings: settings ?? defaultSettings,
  };

  return JSON.stringify(backup, null, 2);
}

/** Triggers a browser download of a JSON backup file. */
export function downloadBackupJSON(json: string, filename?: string): void {
  const name =
    filename ?? `caderneta-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses a backup JSON string, wipes the database, and restores all data.
 * Throws on invalid JSON or missing required fields.
 */
export async function importAppData(json: string): Promise<void> {
  let backup: BackupData;
  try {
    backup = JSON.parse(json) as BackupData;
  } catch {
    throw new Error("Invalid backup file: not valid JSON.");
  }

  if (!backup.version || !backup.exportedAt) {
    throw new Error("Invalid backup file: missing version or exportedAt.");
  }

  await db.adapter.clearAll();

  await Promise.all([
    db.cards.bulkCreate(backup.cards ?? []),
    db.statements.bulkCreate(backup.statements ?? []),
    db.transactions.bulkCreate(backup.transactions ?? []),
    db.categories.bulkCreate(backup.categories ?? []),
    db.categoryRules.bulkCreate(backup.categoryRules ?? []),
    db.goals.bulkCreate(backup.goals ?? []),
    db.recurring.bulkCreate(backup.recurringEntries ?? []),
    db.imports.bulkCreate(backup.importJobs ?? []),
    backup.settings
      ? db.settings.save(backup.settings)
      : db.settings.save(defaultSettings),
  ]);
}
