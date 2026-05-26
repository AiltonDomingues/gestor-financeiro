// ── Card ──────────────────────────────────────────────────────────────────────

export type CardBrand = "Visa" | "Mastercard" | "Elo";

export type Card = {
  id: string;
  name: string;
  bank: string;
  brand: CardBrand;
  last4: string;
  limit: number;
  used: number;
  closingDay: number;
  dueDay: number;
  gradient: string;
  primary?: boolean;
};

// ── Statement ─────────────────────────────────────────────────────────────────

export type StatementStatus = "importada" | "pendente" | "erro" | "duplicada" | "paga";

export type Statement = {
  id: string;
  cardId: string;
  reference: string;    // "Maio de 2026"
  closingDate: string;  // ISO date
  dueDate: string;      // ISO date
  total: number;
  minimum: number;
  itemsCount: number;
  status: StatementStatus;
};

// ── Transaction ───────────────────────────────────────────────────────────────

export type TransactionOrigin = "fatura" | "manual" | "recorrente" | "ajuste" | "transferencia";
export type TransactionStatus = "revisada" | "pendente" | "ignorada";

export type Transaction = {
  id: string;
  date: string;           // ISO 8601
  merchant: string;
  description: string;
  amount: number;         // negative = expense, positive = income
  categoryId: string;
  cardId?: string;
  statementId?: string;
  origin: TransactionOrigin;
  installment?: { current: number; total: number };
  status: TransactionStatus;
  tags?: string[];
  note?: string;
  starred?: boolean;
};

// ── Category ──────────────────────────────────────────────────────────────────

export type CategoryType = "expense" | "income";

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  budget?: number;  // simple monthly budget limit
  type: CategoryType;
  restricted?: boolean;  // benefit income (Vale Alimentação, Vale Refeição) — earmarked, not freely disposable
};

// ── CategoryRule ──────────────────────────────────────────────────────────────

export type CategoryRuleMatchType = "contains" | "startsWith" | "exact" | "regex";

export type CategoryRule = {
  id: string;
  categoryId: string;
  pattern: string;
  matchType: CategoryRuleMatchType;
  priority: number;
  enabled: boolean;
};

// ── Budget ────────────────────────────────────────────────────────────────────

export type BudgetPeriod = "monthly" | "yearly";

export type Budget = {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
};

// ── Goal ──────────────────────────────────────────────────────────────────────

export type GoalStatus = "active" | "completed" | "archived";

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string; // ISO date
  icon: string;
  status: GoalStatus;
};

// ── Investment ──────────────────────────────────────────────────────────────────

export type InvestmentType =
  | "CDB" | "LCI" | "LCA"
  | "Tesouro Selic" | "Tesouro Prefixado" | "Tesouro IPCA+"
  | "Acoes" | "FII" | "ETF"
  | "Cripto" | "Poupanca" | "Fundo" | "Outro";

export type RateIndexer = "CDI" | "Selic" | "IPCA+" | "Prefixado" | "Custom";

export type Investment = {
  id: string;
  name: string;
  institution: string;
  type: InvestmentType;
  rateIndexer: RateIndexer;
  rateValue: number;     // CDI=100 → 100% CDI; IPCA+=5 → IPCA+5%; Prefixado=13.5 → 13.5% a.a.
  initialAmount: number;
  quantity?: number;     // shares/cotas/units — for Ações, FII, ETF, Cripto, Fundo
  startDate: string;     // YYYY-MM-DD
  maturityDate?: string; // YYYY-MM-DD
  status: "active" | "redeemed";
  notes?: string;
};

export type InvestmentMove = {
  id: string;
  investmentId: string;
  date: string;       // YYYY-MM-DD
  amount: number;     // always positive
  type: "aporte" | "resgate";
  notes?: string;
};

export type EconomicRates = {
  selic: number;      // % a.a.
  cdi: number;        // % a.a.
  ipca: number;       // % a.a. (last 12 months)
  updatedAt: string;  // ISO datetime
};

// ── HabitualEntry ─────────────────────────────────────────────────────────────

export type HabitualEntry = {
  id: string;
  name: string;
  emoji: string;
  estimatedAmount: number;
  intervalDays: number;     // typical frequency in days
  categoryId?: string;
  lastDate: string | null;  // ISO date of last payment, null = never paid
};

// ── RecurringEntry ────────────────────────────────────────────────────────────

export type RecurringPeriodicity = "Semanal" | "Quinzenal" | "Mensal" | "Anual";
export type RecurringType = "despesa" | "receita";
export type RecurringPaymentMethod = "cartao" | "pix" | "debito_automatico";
export type RecurringDayRule = "fixed" | "last_business_day" | "prev_business_day";

export type RecurringEntry = {
  id: string;
  name: string;
  amount: number;
  periodicity: RecurringPeriodicity;
  next: string;       // ISO date of next occurrence
  categoryId: string;
  enabled: boolean;
  type: RecurringType;
  paymentMethod?: RecurringPaymentMethod; // undefined = pix (affects cash flow directly)
  dayRule?: RecurringDayRule;   // business-day rule (meaningful when periodicity = "Mensal")
  dueDay?: number;              // target day used with dayRule = "prev_business_day"
};

// ── ImportJob ─────────────────────────────────────────────────────────────────

export type ImportJobStatus = "pending" | "processing" | "reviewed" | "completed" | "failed";

export type ImportJob = {
  id: string;
  file: string;
  date: string;     // ISO datetime
  origin: string;
  items: number;
  errors: number;
  duplicates: number;
  status: ImportJobStatus;
  statementId?: string;
};

// ── AppSettings ───────────────────────────────────────────────────────────────

export type Theme = "dark" | "light";
export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
export type Currency = "BRL" | "USD" | "EUR";

export type AppSettings = {
  theme: Theme;
  language: string;
  currency: Currency;
  dateFormat: DateFormat;
  defaultFilePath: string;
  reprocessRulesOnImport: boolean;
  markPendingForReview: boolean;
  limitNotifications: boolean;
  userName: string;
  dashboard: {
    showMonthlyTrend: boolean;
    showTopMerchants: boolean;
    showUpcomingRecurring: boolean;
    showGoals: boolean;
  };
  security: {
    pinEnabled: boolean;
    pinHash: string;       // SHA-256 hex of the 4-digit PIN
    autoLock: boolean;
    autoLockMinutes: number;
  };
  economicRates: EconomicRates;
};

// ── Backup ────────────────────────────────────────────────────────────────────

export type BackupData = {
  version: number;
  exportedAt: string;
  cards: Card[];
  statements: Statement[];
  transactions: Transaction[];
  categories: Category[];
  categoryRules: CategoryRule[];
  goals: Goal[];
  recurringEntries: RecurringEntry[];
  importJobs: ImportJob[];
  settings: AppSettings;
};
