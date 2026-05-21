import type { StorageAdapter } from "../storage/adapter";
import type { Investment } from "../../domain/types";
import { BaseRepository } from "./base";

export class InvestmentsRepository extends BaseRepository<Investment> {
  constructor(adapter: StorageAdapter) {
    super("investments", adapter);
  }

  async listActive(): Promise<Investment[]> {
    const all = await this.list();
    return all.filter((i) => i.status === "active");
  }
}
