import type { StorageAdapter } from "../storage/adapter";
import type { CategoryRule } from "../../domain/types";
import { BaseRepository } from "./base";

export class CategoryRulesRepository extends BaseRepository<CategoryRule> {
  constructor(adapter: StorageAdapter) {
    super("category_rules", adapter);
  }

  async listByCategory(categoryId: string): Promise<CategoryRule[]> {
    const all = await this.list();
    return all.filter((r) => r.categoryId === categoryId);
  }

  async listEnabled(): Promise<CategoryRule[]> {
    const all = await this.list();
    return all.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  }
}
