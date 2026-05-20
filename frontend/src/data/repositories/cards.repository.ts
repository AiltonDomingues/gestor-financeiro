import type { StorageAdapter } from "../storage/adapter";
import type { Card } from "../../domain/types";
import { BaseRepository } from "./base";

export class CardsRepository extends BaseRepository<Card> {
  constructor(adapter: StorageAdapter) {
    super("cards", adapter);
  }

  async getPrimary(): Promise<Card | undefined> {
    const all = await this.list();
    return all.find((c) => c.primary);
  }
}
