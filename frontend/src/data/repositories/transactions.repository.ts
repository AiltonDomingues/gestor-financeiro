import type { StorageAdapter } from "../storage/adapter";
import type { Transaction } from "../../domain/types";
import { BaseRepository } from "./base";

export class TransactionsRepository extends BaseRepository<Transaction> {
  constructor(adapter: StorageAdapter) {
    super("transactions", adapter);
  }

  async listByCard(cardId: string): Promise<Transaction[]> {
    const all = await this.list();
    return all.filter((t) => t.cardId === cardId);
  }

  async listByStatement(statementId: string): Promise<Transaction[]> {
    const all = await this.list();
    return all.filter((t) => t.statementId === statementId);
  }

  async listByCategory(categoryId: string): Promise<Transaction[]> {
    const all = await this.list();
    return all.filter((t) => t.categoryId === categoryId);
  }

  async listPending(): Promise<Transaction[]> {
    const all = await this.list();
    return all.filter((t) => t.status === "pendente");
  }
}
