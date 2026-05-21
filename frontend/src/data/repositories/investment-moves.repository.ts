import type { StorageAdapter } from "../storage/adapter";
import type { InvestmentMove } from "../../domain/types";
import { BaseRepository } from "./base";

export class InvestmentMovesRepository extends BaseRepository<InvestmentMove> {
  constructor(adapter: StorageAdapter) {
    super("investment_moves", adapter);
  }

  async listByInvestment(investmentId: string): Promise<InvestmentMove[]> {
    const all = await this.list();
    return all.filter((m) => m.investmentId === investmentId);
  }
}
