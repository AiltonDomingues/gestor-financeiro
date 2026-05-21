import { IDBStorageAdapter } from "./storage/idb-adapter";
import {
  TransactionsRepository,
  CardsRepository,
  StatementsRepository,
  CategoriesRepository,
  BudgetsRepository,
  GoalsRepository,
  RecurringRepository,
  ImportsRepository,
  SettingsRepository,
  CategoryRulesRepository,
  InvestmentsRepository,
  InvestmentMovesRepository,
} from "./repositories";

/**
 * Singleton database access object.
 * All app code should import `db` from here rather than
 * constructing its own adapter or repository instances.
 */
const adapter = new IDBStorageAdapter();

export const db = {
  transactions: new TransactionsRepository(adapter),
  cards: new CardsRepository(adapter),
  statements: new StatementsRepository(adapter),
  categories: new CategoriesRepository(adapter),
  budgets: new BudgetsRepository(adapter),
  goals: new GoalsRepository(adapter),
  recurring: new RecurringRepository(adapter),
  imports: new ImportsRepository(adapter),
  settings: new SettingsRepository(adapter),
  categoryRules: new CategoryRulesRepository(adapter),
  investments: new InvestmentsRepository(adapter),
  investmentMoves: new InvestmentMovesRepository(adapter),
  /** Expose the raw adapter for backup clear-all and migration use. */
  adapter,
};
