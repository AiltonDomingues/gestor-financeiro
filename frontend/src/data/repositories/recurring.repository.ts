import type { StorageAdapter } from "../storage/adapter";
import type { RecurringEntry } from "../../domain/types";
import { BaseRepository } from "./base";

export class RecurringRepository extends BaseRepository<RecurringEntry> {
  constructor(adapter: StorageAdapter) {
    super("recurring", adapter);
  }

  async listEnabled(): Promise<RecurringEntry[]> {
    const all = await this.list();
    return all.filter((r) => r.enabled);
  }
}
