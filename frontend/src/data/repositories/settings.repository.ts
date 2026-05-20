import type { StorageAdapter } from "../storage/adapter";
import type { AppSettings } from "../../domain/types";

// Settings is a single-document store; we use a fixed key.
const SETTINGS_KEY = "app_settings";

export class SettingsRepository {
  constructor(private readonly adapter: StorageAdapter) {}

  async get(): Promise<AppSettings | undefined> {
    type Stored = AppSettings & { id: string };
    const result = await this.adapter.get<Stored>("settings", SETTINGS_KEY);
    if (!result) return undefined;
    // Strip the internal storage key before returning the domain type.
    const { id: _id, ...settings } = result;
    return settings as AppSettings;
  }

  async save(settings: AppSettings): Promise<void> {
    await this.adapter.set("settings", SETTINGS_KEY, settings);
  }

  async patch(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    if (!current) throw new Error("Settings not initialised — call save() first.");
    const updated: AppSettings = { ...current, ...patch };
    await this.save(updated);
    return updated;
  }
}
