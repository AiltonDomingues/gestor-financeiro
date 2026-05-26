import type { StorageAdapter } from "../storage/adapter";
import type { HabitualEntry } from "../../domain/types";
import { BaseRepository } from "./base";

export class HabitualRepository extends BaseRepository<HabitualEntry> {
  constructor(adapter: StorageAdapter) {
    super("habitual", adapter);
  }
}
