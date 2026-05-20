import type { StorageAdapter } from "../storage/adapter";
import type { Category } from "../../domain/types";
import { BaseRepository } from "./base";

export class CategoriesRepository extends BaseRepository<Category> {
  constructor(adapter: StorageAdapter) {
    super("categories", adapter);
  }
}
