import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  AppSettings,
  Card,
  Category,
  Goal,
  ImportJob,
  RecurringEntry,
  Statement,
  Transaction,
} from "../domain/types";
import { db } from "../data/db";
import { seedDatabaseIfEmpty } from "../data/seed";

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

  // Goals
  addGoal: (g: Omit<Goal, "id">) => Promise<Goal>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;

  // Recurring
  addRecurring: (r: Omit<RecurringEntry, "id">) => Promise<RecurringEntry>;
  updateRecurring: (id: string, patch: Partial<RecurringEntry>) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;

  // Import jobs
  addImportJob: (j: Omit<ImportJob, "id">) => Promise<ImportJob>;
  updateImportJob: (id: string, patch: Partial<ImportJob>) => Promise<void>;

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
    autoLock: true,
    autoLockMinutes: 10,
  },
};

// ── Provider ──────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurring, setRecurring] = useState<RecurringEntry[]>([]);
  const [imports, setImports] = useState<ImportJob[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        await seedDatabaseIfEmpty();
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
        const loaded = s ?? DEFAULT_SETTINGS;
        setSettings(loaded);
        applyTheme(loaded.theme);
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

  // ── Settings ───────────────────────────────────────────────────────────────

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const updated = await db.settings.patch(patch);
    setSettings(updated);
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

  const value: AppDataContextValue = {
    loading,
    transactions,
    cards,
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
    addGoal,
    updateGoal,
    deleteGoal,
    addRecurring,
    updateRecurring,
    deleteRecurring,
    addImportJob,
    updateImportJob,
    updateSettings,
    exportBackup,
    importBackup,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
