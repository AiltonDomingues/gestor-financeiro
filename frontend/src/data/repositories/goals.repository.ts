import type { StorageAdapter } from "../storage/adapter";
import type { Goal } from "../../domain/types";
import { BaseRepository } from "./base";

export class GoalsRepository extends BaseRepository<Goal> {
  constructor(adapter: StorageAdapter) {
    super("goals", adapter);
  }

  async listActive(): Promise<Goal[]> {
    const all = await this.list();
    return all.filter((g) => g.status === "active");
  }
}
