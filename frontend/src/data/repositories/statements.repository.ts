import type { StorageAdapter } from "../storage/adapter";
import type { Statement } from "../../domain/types";
import { BaseRepository } from "./base";

export class StatementsRepository extends BaseRepository<Statement> {
  constructor(adapter: StorageAdapter) {
    super("statements", adapter);
  }

  async listByCard(cardId: string): Promise<Statement[]> {
    const all = await this.list();
    return all.filter((s) => s.cardId === cardId);
  }
}
