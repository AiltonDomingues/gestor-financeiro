import type { StorageAdapter } from "../storage/adapter";
import type { ImportJob } from "../../domain/types";
import { BaseRepository } from "./base";

export class ImportsRepository extends BaseRepository<ImportJob> {
  constructor(adapter: StorageAdapter) {
    super("imports", adapter);
  }
}
