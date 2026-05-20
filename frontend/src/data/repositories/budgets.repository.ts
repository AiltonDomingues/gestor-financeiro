import type { StorageAdapter } from "../storage/adapter";
import type { Budget } from "../../domain/types";
import { BaseRepository } from "./base";

export class BudgetsRepository extends BaseRepository<Budget> {
  constructor(adapter: StorageAdapter) {
    super("budgets", adapter);
  }

  async getByCategory(categoryId: string): Promise<Budget | undefined> {
    const all = await this.list();
    return all.find((b) => b.categoryId === categoryId);
  }
}
