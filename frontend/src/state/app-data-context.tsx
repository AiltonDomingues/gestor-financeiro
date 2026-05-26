import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,  useMemo,  useRef,
  useState,
} from "react";
import type {
  AppSettings,
  Card,
  Category,
  CategoryRule,
  Goal,
  HabitualEntry,
  ImportJob,
  Investment,
  InvestmentMove,
  RecurringEntry,
  Statement,
  Transaction,
} from "../domain/types";
import { db } from "../data/db";
import { seedDatabaseIfEmpty } from "../data/seed";
import { computeCardUsed } from "../lib/selectors";

// ── Context type ──────────────────────────────────────────────────────────────

type AppDataContextValue = {
  loading: boolean;
  transactions: Transaction[];
  cards: Card[];
  statements: Statement[];
  categories: Category[];
  goals: Goal[];
  recurring: RecurringEntry[];
  imports: ImportJob[];
  settings: AppSettings;

  // Transactions
  addTransaction: (t: Omit<Transaction, "id">) => Promise<Transaction>;
  updateTransaction: (id: string, patch: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Cards
  addCard: (c: Omit<Card, "id">) => Promise<Card>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;

  // Statements
  addStatement: (s: Omit<Statement, "id">) => Promise<Statement>;
  updateStatement: (id: string, patch: Partial<Statement>) => Promise<void>;
  deleteStatement: (id: string) => Promise<void>;

  // Categories
  addCategory: (c: Omit<Category, "id">) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Category Rules
  categoryRules: CategoryRule[];
  addCategoryRule: (r: Omit<CategoryRule, "id">) => Promise<CategoryRule>;
  updateCategoryRule: (id: string, patch: Partial<CategoryRule>) => Promise<void>;
  deleteCategoryRule: (id: string) => Promise<void>;

  // Goals
  addGoal: (g: Omit<Goal, "id">) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Recurring
  addRecurring: (r: Omit<RecurringEntry, "id">) => Promise<RecurringEntry>;
  updateRecurring: (id: string, patch: Partial<RecurringEntry>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;

  // Habitual
  habitualEntries: HabitualEntry[];
  addHabitual: (h: Omit<HabitualEntry, "id">) => Promise<HabitualEntry>;
  updateHabitual: (id: string, patch: Partial<HabitualEntry>) => Promise<void>;
  deleteHabitual: (id: string) => Promise<void>;

  // Import jobs
  addImportJob: (j: Omit<ImportJob, "id">) => Promise<ImportJob>;
  updateImportJob: (id: string, patch: Partial<ImportJob>) => Promise<void>;

  // Investments
  investments: Investment[];
  addInvestment: (inv: Omit<Investment, "id">) => Promise<Investment>;
  updateInvestment: (id: string, patch: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;

  // Investment moves
  investmentMoves: InvestmentMove[];
  addInvestmentMove: (m: Omit<InvestmentMove, "id">) => Promise<InvestmentMove>;
  deleteInvestmentMove: (id: string) => Promise<void>;

  // Settings
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;

  // Backup
  exportBackup: () => Promise<string>;
  importBackup: (json: string) => Promise<void>;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside <AppDataProvider>");
  return ctx;
}

// ── Default settings (used as SSR placeholder) ────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  language: "pt-BR",
  currency: "BRL",
  dateFormat: "DD/MM/YYYY",
  defaultFilePath: "~/Documentos/Caderneta/faturas",
  reprocessRulesOnImport: true,
  markPendingForReview: true,
  limitNotifications: true,
  userName: "Ailton Domingues",
  dashboard: {
    showMonthlyTrend: true,
    showTopMerchants: true,
    showUpcomingRecurring: true,
    showGoals: true,
  },
  security: {
    pinEnabled: false,
    pinHash: "",
    autoLock: true,
    autoLockMinutes: 10,
  },
  economicRates: {
    selic: 14.75,
    cdi: 14.65,
    ipca: 5.53,
    updatedAt: "",
  },
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurring, setRecurring] = useState<RecurringEntry[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [investmentMoves, setInvestmentMoves] = useState<InvestmentMove[]>([]);
  const [habitualEntries, setHabitualEntries] = useState<HabitualEntry[]>([]);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        await seedDatabaseIfEmpty();
        const [txs, cds, stmts, cats, catRules, gls, rec, imps, s, invs, invMoves, hab] = await Promise.all([
          db.transactions.list(),
          db.cards.list(),
          db.statements.list(),
          db.categories.list(),
          db.categoryRules.list(),
          db.goals.list(),
          db.recurring.list(),
          db.imports.list(),
          db.settings.get(),
          db.investments.list(),
          db.investmentMoves.list(),
          db.habitual.list(),
        ]);
        setTransactions(txs.sort((a, b) => +new Date(b.date) - +new Date(a.date)));
        setCards(cds);
        setStatements(stmts);
        setCategories(cats);
        setCategoryRules(catRules.sort((a, b) => a.priority - b.priority));
        setGoals(gls);
        setRecurring(rec);
        setImports(imps.sort((a, b) => +new Date(b.date) - +new Date(a.date)));
        const loaded = s ?? DEFAULT_SETTINGS;
        // Merge so existing settings without economicRates get defaults
        setSettings({ ...DEFAULT_SETTINGS, ...loaded, economicRates: loaded.economicRates ?? DEFAULT_SETTINGS.economicRates });
        applyTheme(loaded.theme);
        setInvestments(invs);
        setInvestmentMoves(invMoves);
        setHabitualEntries(hab);
      } catch (err) {
        console.error("[AppDataProvider] Failed to initialize:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function applyTheme(theme: AppSettings["theme"]) {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }

  // ── Transactions ───────────────────────────────────────────────────────────

  const addTransaction = useCallback(async (t: Omit<Transaction, "id">): Promise<Transaction> => {
    const entity: Transaction = { ...t, id: crypto.randomUUID() };
    await db.transactions.create(entity);
    setTransactions((prev) =>
      [entity, ...prev].sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    );
    return entity;
  }, []);

  const updateTransaction = useCallback(async (id: string, patch: Partial<Transaction>) => {
    const updated = await db.transactions.update(id, patch);
    setTransactions((prev) =>
      prev
        .map((t) => (t.id === id ? updated : t))
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    );
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    await db.transactions.delete(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Cards ──────────────────────────────────────────────────────────────────

  const addCard = useCallback(async (c: Omit<Card, "id">): Promise<Card> => {
    const entity: Card = { ...c, id: crypto.randomUUID() };
    await db.cards.create(entity);
    setCards((prev) => [...prev, entity]);
    return entity;
  }, []);

  const updateCard = useCallback(async (id: string, patch: Partial<Card>) => {
    const updated = await db.cards.update(id, patch);
    setCards((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const deleteCard = useCallback(async (id: string) => {
    await db.cards.delete(id);
    setCards((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Statements ─────────────────────────────────────────────────────────────

  const addStatement = useCallback(async (s: Omit<Statement, "id">): Promise<Statement> => {
    const entity: Statement = { ...s, id: crypto.randomUUID() };
    await db.statements.create(entity);
    setStatements((prev) => [entity, ...prev]);
    return entity;
  }, []);

  const updateStatement = useCallback(async (id: string, patch: Partial<Statement>) => {
    const updated = await db.statements.update(id, patch);
    setStatements((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, []);

  const deleteStatement = useCallback(async (id: string) => {
    await db.statements.delete(id);
    setStatements((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // ── Categories ─────────────────────────────────────────────────────────────

  const addCategory = useCallback(async (c: Omit<Category, "id">): Promise<Category> => {
    const entity: Category = { ...c, id: crypto.randomUUID() };
    await db.categories.create(entity);
    setCategories((prev) => [...prev, entity]);
    return entity;
  }, []);

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    const updated = await db.categories.update(id, patch);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await db.categories.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // ── Category Rules ─────────────────────────────────────────────────────────

  const addCategoryRule = useCallback(async (r: Omit<CategoryRule, "id">): Promise<CategoryRule> => {
    const entity: CategoryRule = { ...r, id: crypto.randomUUID() };
    await db.categoryRules.create(entity);
    setCategoryRules((prev) => [...prev, entity].sort((a, b) => a.priority - b.priority));
    return entity;
  }, []);

  const updateCategoryRule = useCallback(async (id: string, patch: Partial<CategoryRule>) => {
    const updated = await db.categoryRules.update(id, patch);
    setCategoryRules((prev) =>
      prev.map((r) => (r.id === id ? updated : r)).sort((a, b) => a.priority - b.priority),
    );
  }, []);

  const deleteCategoryRule = useCallback(async (id: string) => {
    await db.categoryRules.delete(id);
    setCategoryRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Goals ──────────────────────────────────────────────────────────────────

  const addGoal = useCallback(async (g: Omit<Goal, "id">): Promise<Goal> => {
    const entity: Goal = { ...g, id: crypto.randomUUID() };
    await db.goals.create(entity);
    setGoals((prev) => [...prev, entity]);
    return entity;
  }, []);

  const updateGoal = useCallback(async (id: string, patch: Partial<Goal>) => {
    const updated = await db.goals.update(id, patch);
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
  }, []);

  const deleteGoal = useCallback(async (id: string) => {
    await db.goals.delete(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }, []);

  // ── Recurring ──────────────────────────────────────────────────────────────

  const addRecurring = useCallback(
    async (r: Omit<RecurringEntry, "id">): Promise<RecurringEntry> => {
      const entity: RecurringEntry = { ...r, id: crypto.randomUUID() };
      await db.recurring.create(entity);
      setRecurring((prev) => [...prev, entity]);
      return entity;
    },
    [],
  );

  const updateRecurring = useCallback(async (id: string, patch: Partial<RecurringEntry>) => {
    const updated = await db.recurring.update(id, patch);
    setRecurring((prev) => prev.map((r) => (r.id === id ? updated : r)));
  }, []);

  const deleteRecurring = useCallback(async (id: string) => {
    await db.recurring.delete(id);
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // ── Habitual ───────────────────────────────────────────────────────────────

  const addHabitual = useCallback(async (h: Omit<HabitualEntry, "id">): Promise<HabitualEntry> => {
    const entity: HabitualEntry = { ...h, id: crypto.randomUUID() };
    await db.habitual.create(entity);
    setHabitualEntries((prev) => [...prev, entity]);
    return entity;
  }, []);

  const updateHabitual = useCallback(async (id: string, patch: Partial<HabitualEntry>) => {
    const updated = await db.habitual.update(id, patch);
    setHabitualEntries((prev) => prev.map((h) => (h.id === id ? updated : h)));
  }, []);

  const deleteHabitual = useCallback(async (id: string) => {
    await db.habitual.delete(id);
    setHabitualEntries((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // ── Import Jobs ────────────────────────────────────────────────────────────

  const addImportJob = useCallback(async (j: Omit<ImportJob, "id">): Promise<ImportJob> => {
    const entity: ImportJob = { ...j, id: crypto.randomUUID() };
    await db.imports.create(entity);
    setImports((prev) => [entity, ...prev]);
    return entity;
  }, []);

  const updateImportJob = useCallback(async (id: string, patch: Partial<ImportJob>) => {
    const updated = await db.imports.update(id, patch);
    setImports((prev) => prev.map((j) => (j.id === id ? updated : j)));
  }, []);

  // ── Investments ────────────────────────────────────────────────────────────

  const addInvestment = useCallback(async (inv: Omit<Investment, "id">): Promise<Investment> => {
    const entity: Investment = { ...inv, id: crypto.randomUUID() };
    await db.investments.create(entity);
    setInvestments((prev) => [...prev, entity]);
    return entity;
  }, []);

  const updateInvestment = useCallback(async (id: string, patch: Partial<Investment>) => {
    const updated = await db.investments.update(id, patch);
    setInvestments((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }, []);

  const deleteInvestment = useCallback(async (id: string) => {
    await db.investments.delete(id);
    // also remove all associated moves
    const moves = investmentMoves.filter((m) => m.investmentId === id);
    await Promise.all(moves.map((m) => db.investmentMoves.delete(m.id)));
    setInvestments((prev) => prev.filter((i) => i.id !== id));
    setInvestmentMoves((prev) => prev.filter((m) => m.investmentId !== id));
  }, [investmentMoves]);

  // ── Investment Moves ───────────────────────────────────────────────────────

  const addInvestmentMove = useCallback(async (m: Omit<InvestmentMove, "id">): Promise<InvestmentMove> => {
    const entity: InvestmentMove = { ...m, id: crypto.randomUUID() };
    await db.investmentMoves.create(entity);
    setInvestmentMoves((prev) => [...prev, entity]);
    return entity;
  }, []);

  const deleteInvestmentMove = useCallback(async (id: string) => {
    await db.investmentMoves.delete(id);
    setInvestmentMoves((prev) => prev.filter((m) => m.id !== id));
  }, []);

  // ── Settings ───────────────────────────────────────────────────────────────

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    await db.settings.patch(patch);
    // Update in-memory state from current value (not from DB read-back, which may
    // lack fields missing in old IndexedDB records e.g. economicRates)
    setSettings(prev => ({ ...prev!, ...patch }));
    if (patch.theme) applyTheme(patch.theme);
  }, []);

  // ── Backup ─────────────────────────────────────────────────────────────────

  const exportBackup = useCallback(async (): Promise<string> => {
    const { exportAppData } = await import("../services/backup");
    return exportAppData();
  }, []);

  const importBackup = useCallback(async (json: string) => {
    const { importAppData } = await import("../services/backup");
    await importAppData(json);
    // Reload all data from storage after import
    const [txs, cds, stmts, cats, gls, rec, imps, s] = await Promise.all([
      db.transactions.list(),
      db.cards.list(),
      db.statements.list(),
      db.categories.list(),
      db.goals.list(),
      db.recurring.list(),
      db.imports.list(),
      db.settings.get(),
    ]);
    setTransactions(txs.sort((a, b) => +new Date(b.date) - +new Date(a.date)));
    setCards(cds);
    setStatements(stmts);
    setCategories(cats);
    setGoals(gls);
    setRecurring(rec);
    setImports(imps.sort((a, b) => +new Date(b.date) - +new Date(a.date)));
    if (s) {
      setSettings(s);
      applyTheme(s.theme);
    }
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────

  const cardsWithComputedUsed = useMemo(
    () => cards.map((c) => ({ ...c, used: computeCardUsed(c.id, transactions, statements) })),
    [cards, transactions, statements],
  );

  const value: AppDataContextValue = {
    loading,
    transactions,
    cards: cardsWithComputedUsed,
    statements,
    categories,
    goals,
    recurring,
    imports,
    settings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCard,
    updateCard,
    deleteCard,
    addStatement,
    updateStatement,
    deleteStatement,
    addCategory,
    updateCategory,
    deleteCategory,
    categoryRules,
    addCategoryRule,
    updateCategoryRule,
    deleteCategoryRule,
    addGoal,
    updateGoal,
    deleteGoal,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    habitualEntries,
    addHabitual,
    updateHabitual,
    deleteHabitual,
    addImportJob,
    updateImportJob,
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    investmentMoves,
    addInvestmentMove,
    deleteInvestmentMove,
    updateSettings,
    exportBackup,
    importBackup,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
