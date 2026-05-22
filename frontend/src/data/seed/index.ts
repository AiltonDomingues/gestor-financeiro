import type {
  AppSettings,
  Card,
  Category,
  CategoryRule,
  Goal,
  ImportJob,
  RecurringEntry,
  Statement,
  Transaction,
} from "../../domain/types";
import { db } from "../db";

// ── Default Settings ──────────────────────────────────────────────────────────

export const defaultSettings: AppSettings = {
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

// ── Categories ────────────────────────────────────────────────────────────────

export const seedCategories: Category[] = [
  // ── Despesas ────────────────────────────────────────────────────────────────
  { id: "alimentacao", name: "Alimentação", icon: "🍽️", color: "oklch(0.72 0.16 30)", budget: 1800, type: "expense" },
  { id: "mercado", name: "Mercado", icon: "🛒", color: "oklch(0.72 0.16 158)", budget: 1500, type: "expense" },
  { id: "transporte", name: "Transporte", icon: "🚗", color: "oklch(0.72 0.16 255)", budget: 600, type: "expense" },
  { id: "streaming", name: "Streaming", icon: "🎬", color: "oklch(0.74 0.16 305)", budget: 200, type: "expense" },
  { id: "farmacia", name: "Farmácia", icon: "💊", color: "oklch(0.7 0.16 15)", budget: 300, type: "expense" },
  { id: "assinaturas", name: "Assinaturas", icon: "🔁", color: "oklch(0.74 0.14 280)", budget: 250, type: "expense" },
  { id: "saude", name: "Saúde", icon: "❤️", color: "oklch(0.66 0.2 18)", budget: 400, type: "expense" },
  { id: "lazer", name: "Lazer", icon: "🎭", color: "oklch(0.78 0.15 75)", budget: 500, type: "expense" },
  { id: "casa", name: "Casa", icon: "🏠", color: "oklch(0.7 0.12 200)", budget: 800, type: "expense" },
  { id: "educacao", name: "Educação", icon: "📚", color: "oklch(0.72 0.14 230)", budget: 350, type: "expense" },
  { id: "outros", name: "Outros", icon: "📦", color: "oklch(0.68 0.06 240)", type: "expense" },
  // ── Receitas ─────────────────────────────────────────────────────────────────
  { id: "salario", name: "Salário", icon: "💰", color: "oklch(0.72 0.18 158)", type: "income" },
  { id: "vale-alimentacao", name: "Vale Alimentação", icon: "🛒", color: "oklch(0.72 0.16 100)", type: "income", restricted: true },
  { id: "vale-refeicao", name: "Vale Refeição", icon: "🥗", color: "oklch(0.72 0.16 120)", type: "income", restricted: true },
  { id: "freelance", name: "Freelance", icon: "💻", color: "oklch(0.72 0.16 255)", type: "income" },
  { id: "extra", name: "Extra / Bônus", icon: "⭐", color: "oklch(0.78 0.15 75)", type: "income" },
  { id: "outros-receita", name: "Outras Receitas", icon: "📥", color: "oklch(0.68 0.06 240)", type: "income" },
];

// ── Cards ─────────────────────────────────────────────────────────────────────

export const seedCards: Card[] = [
  {
    id: "santander-unique",
    name: "Santander Unique",
    bank: "Santander",
    brand: "Mastercard",
    last4: "4821",
    limit: 18000,
    used: 12420.55,
    closingDay: 15,
    dueDay: 22,
    gradient: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 60%, #1f2937 100%)",
    primary: true,
  },
  {
    id: "santander-unlimited",
    name: "Santander Unlimited",
    bank: "Santander",
    brand: "Visa",
    last4: "9034",
    limit: 25000,
    used: 8240.18,
    closingDay: 5,
    dueDay: 12,
    gradient: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)",
  },
  {
    id: "nubank",
    name: "Nubank Ultravioleta",
    bank: "Nubank",
    brand: "Mastercard",
    last4: "2218",
    limit: 12000,
    used: 3120.0,
    closingDay: 20,
    dueDay: 27,
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #2e1065 100%)",
  },
];

// ── Statements ────────────────────────────────────────────────────────────────

export const seedStatements: Statement[] = [
  {
    id: "s1",
    cardId: "santander-unique",
    reference: "Maio de 2026",
    closingDate: "2026-05-15",
    dueDate: "2026-05-22",
    total: 4820.55,
    minimum: 720.18,
    itemsCount: 34,
    status: "pendente",
  },
  {
    id: "s2",
    cardId: "santander-unique",
    reference: "Abril de 2026",
    closingDate: "2026-04-15",
    dueDate: "2026-04-22",
    total: 3920.4,
    minimum: 588.06,
    itemsCount: 28,
    status: "importada",
  },
  {
    id: "s3",
    cardId: "santander-unlimited",
    reference: "Maio de 2026",
    closingDate: "2026-05-05",
    dueDate: "2026-05-12",
    total: 2480.18,
    minimum: 372.02,
    itemsCount: 19,
    status: "importada",
  },
  {
    id: "s4",
    cardId: "nubank",
    reference: "Maio de 2026",
    closingDate: "2026-05-20",
    dueDate: "2026-05-27",
    total: 1820.0,
    minimum: 273.0,
    itemsCount: 14,
    status: "importada",
  },
  {
    id: "s5",
    cardId: "santander-unique",
    reference: "Março de 2026",
    closingDate: "2026-03-15",
    dueDate: "2026-03-22",
    total: 5120.7,
    minimum: 768.1,
    itemsCount: 41,
    status: "importada",
  },
];

// ── Goals ─────────────────────────────────────────────────────────────────────

export const seedGoals: Goal[] = [
  {
    id: "g1",
    name: "Reserva de Emergência",
    target: 30000,
    current: 18450,
    deadline: "2026-12-31",
    icon: "🛟",
    status: "active",
  },
  {
    id: "g2",
    name: "Viagem Japão",
    target: 22000,
    current: 7820,
    deadline: "2027-03-15",
    icon: "🗾",
    status: "active",
  },
  {
    id: "g3",
    name: "MacBook Pro",
    target: 18000,
    current: 14200,
    deadline: "2026-08-30",
    icon: "💻",
    status: "active",
  },
  {
    id: "g4",
    name: "Quitar Cartão",
    target: 12000,
    current: 9300,
    deadline: "2026-07-30",
    icon: "💳",
    status: "active",
  },
];

// ── Recurring Entries ─────────────────────────────────────────────────────────

export const seedRecurring: RecurringEntry[] = [
  {
    id: "r1",
    name: "Netflix Premium",
    amount: 55.9,
    periodicity: "Mensal",
    next: "2026-05-22",
    categoryId: "streaming",
    enabled: true,
    type: "despesa",
  },
  {
    id: "r2",
    name: "Spotify Family",
    amount: 34.9,
    periodicity: "Mensal",
    next: "2026-05-24",
    categoryId: "assinaturas",
    enabled: true,
    type: "despesa",
  },
  {
    id: "r3",
    name: "Internet Vivo Fibra",
    amount: 149.9,
    periodicity: "Mensal",
    next: "2026-05-28",
    categoryId: "casa",
    enabled: true,
    type: "despesa",
  },
  {
    id: "r4",
    name: "Aluguel",
    amount: 3200,
    periodicity: "Mensal",
    next: "2026-06-05",
    categoryId: "casa",
    enabled: true,
    type: "despesa",
  },
  {
    id: "r5",
    name: "Salário",
    amount: 14500,
    periodicity: "Mensal",
    next: "2026-06-05",
    categoryId: "salario",
    enabled: true,
    type: "receita",
  },
  {
    id: "r6",
    name: "Smart Fit",
    amount: 119.9,
    periodicity: "Mensal",
    next: "2026-05-30",
    categoryId: "saude",
    enabled: true,
    type: "despesa",
  },
  {
    id: "r7",
    name: "iCloud 2TB",
    amount: 49.9,
    periodicity: "Mensal",
    next: "2026-06-02",
    categoryId: "assinaturas",
    enabled: false,
    type: "despesa",
  },
];

// ── Import Jobs ───────────────────────────────────────────────────────────────

export const seedImports: ImportJob[] = [
  {
    id: "i1",
    file: "santander_unique_05_2026.pdf",
    date: "2026-05-16T09:24:00",
    origin: "Santander",
    items: 34,
    errors: 0,
    duplicates: 0,
    status: "completed",
  },
  {
    id: "i2",
    file: "santander_unlimited_05_2026.pdf",
    date: "2026-05-06T18:01:00",
    origin: "Santander",
    items: 19,
    errors: 0,
    duplicates: 1,
    status: "completed",
  },
  {
    id: "i3",
    file: "nubank_05_2026.pdf",
    date: "2026-05-21T11:11:00",
    origin: "Nubank",
    items: 14,
    errors: 0,
    duplicates: 0,
    status: "completed",
  },
  {
    id: "i4",
    file: "santander_unique_04_2026.pdf",
    date: "2026-04-16T08:00:00",
    origin: "Santander",
    items: 28,
    errors: 2,
    duplicates: 0,
    status: "reviewed",
  },
];

// ── Category Rules ────────────────────────────────────────────────────────────

export const seedCategoryRules: CategoryRule[] = [
  { id: "cr1", categoryId: "alimentacao", pattern: "IFOOD", matchType: "contains", priority: 1, enabled: true },
  { id: "cr2", categoryId: "transporte", pattern: "UBER", matchType: "contains", priority: 2, enabled: true },
  { id: "cr3", categoryId: "farmacia", pattern: "DROGA", matchType: "contains", priority: 3, enabled: true },
  { id: "cr4", categoryId: "mercado", pattern: "PÃO DE AÇÚCAR", matchType: "contains", priority: 4, enabled: true },
];

// ── Transaction Generator ─────────────────────────────────────────────────────

/** Seeded pseudo-random number generator (LCG) — same seed = same results. */
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const merchantPool: [string, string][] = [
  ["iFood", "alimentacao"],
  ["Uber", "transporte"],
  ["Amazon", "casa"],
  ["Netflix", "streaming"],
  ["Spotify", "assinaturas"],
  ["Droga Raia", "farmacia"],
  ["Shell Posto", "transporte"],
  ["Smart Fit", "saude"],
  ["Pão de Açúcar", "mercado"],
  ["Carrefour", "mercado"],
  ["Apple.com/BR", "assinaturas"],
  ["Mercado Livre", "casa"],
  ["Cinemark", "lazer"],
  ["99 App", "transporte"],
  ["Padaria Bella", "alimentacao"],
  ["iFood Mercado", "mercado"],
  ["Disney+", "streaming"],
  ["Outback", "alimentacao"],
  ["Drogasil", "farmacia"],
  ["Magazine Luiza", "casa"],
];

const cardIds = ["santander-unique", "santander-unlimited", "nubank"];

function generateMayTransactions(): Transaction[] {
  const r = rand(42);
  const list: Transaction[] = [];
  for (let i = 0; i < 60; i++) {
    const m = merchantPool[Math.floor(r() * merchantPool.length)];
    const day = Math.max(1, Math.floor(r() * 20) + 1);
    const date = new Date(2026, 4, day).toISOString();
    const amount = -Math.round((r() * 380 + 18) * 100) / 100;
    const hasInstallment = r() > 0.78;
    const cardIdx = r() > 0.5 ? 0 : r() > 0.5 ? 1 : 2;
    list.push({
      id: `tx-${i}`,
      date,
      merchant: m[0],
      description: m[0].toUpperCase() + " *COMPRA",
      amount,
      categoryId: m[1],
      cardId: cardIds[cardIdx],
      origin: r() > 0.3 ? "fatura" : r() > 0.5 ? "manual" : "recorrente",
      installment: hasInstallment
        ? { current: Math.floor(r() * 6) + 1, total: Math.floor(r() * 6) + 6 }
        : undefined,
      status: r() > 0.25 ? "revisada" : "pendente",
      starred: r() > 0.9,
    });
  }
  // Salary credit for May
  list.push({
    id: "tx-salary-may",
    date: new Date(2026, 4, 5).toISOString(),
    merchant: "Salário",
    description: "CRÉDITO SALÁRIO",
    amount: 14500,
    categoryId: "salario",
    origin: "manual",
    status: "revisada",
  });
  return list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

type HistoricalMonth = {
  year: number;
  month: number; // 0-indexed
  salary: number;
  expenses: [string, string, number][]; // [merchant, categoryId, amount]
};

const historicalMonths: HistoricalMonth[] = [
  {
    year: 2025,
    month: 11,
    salary: 14000,
    expenses: [
      ["iFood", "alimentacao", -420],
      ["Carrefour", "mercado", -890],
      ["Uber", "transporte", -280],
      ["Netflix", "streaming", -55.9],
      ["Smart Fit", "saude", -119.9],
      ["Outback", "alimentacao", -380],
      ["Amazon", "casa", -310],
      ["Droga Raia", "farmacia", -180],
      ["Spotify", "assinaturas", -34.9],
      ["Mercado Livre", "casa", -620],
      ["Cinemark", "lazer", -90],
      ["Shell Posto", "transporte", -180],
      ["Pão de Açúcar", "mercado", -460],
      ["Apple.com/BR", "assinaturas", -49.9],
      ["Aluguel", "casa", -3200],
    ],
  },
  {
    year: 2026,
    month: 0,
    salary: 14000,
    expenses: [
      ["iFood", "alimentacao", -510],
      ["Carrefour", "mercado", -980],
      ["Uber", "transporte", -310],
      ["Netflix", "streaming", -55.9],
      ["Smart Fit", "saude", -119.9],
      ["Outback", "alimentacao", -420],
      ["Amazon", "casa", -380],
      ["Droga Raia", "farmacia", -210],
      ["Spotify", "assinaturas", -34.9],
      ["Mercado Livre", "casa", -580],
      ["Cinemark", "lazer", -120],
      ["Shell Posto", "transporte", -200],
      ["Pão de Açúcar", "mercado", -510],
      ["Apple.com/BR", "assinaturas", -49.9],
      ["Aluguel", "casa", -3200],
    ],
  },
  {
    year: 2026,
    month: 1,
    salary: 14000,
    expenses: [
      ["iFood", "alimentacao", -390],
      ["Carrefour", "mercado", -820],
      ["Uber", "transporte", -240],
      ["Netflix", "streaming", -55.9],
      ["Smart Fit", "saude", -119.9],
      ["Padaria Bella", "alimentacao", -280],
      ["Amazon", "casa", -290],
      ["Drogasil", "farmacia", -160],
      ["Spotify", "assinaturas", -34.9],
      ["Mercado Livre", "casa", -480],
      ["Cinemark", "lazer", -90],
      ["Shell Posto", "transporte", -160],
      ["Pão de Açúcar", "mercado", -490],
      ["Apple.com/BR", "assinaturas", -49.9],
      ["Aluguel", "casa", -3200],
    ],
  },
  {
    year: 2026,
    month: 2,
    salary: 14500,
    expenses: [
      ["iFood", "alimentacao", -620],
      ["Carrefour", "mercado", -1100],
      ["Uber", "transporte", -380],
      ["Netflix", "streaming", -55.9],
      ["Smart Fit", "saude", -119.9],
      ["Outback", "alimentacao", -560],
      ["Magazine Luiza", "casa", -890],
      ["Droga Raia", "farmacia", -240],
      ["Spotify", "assinaturas", -34.9],
      ["Mercado Livre", "casa", -720],
      ["Cinemark", "lazer", -180],
      ["Shell Posto", "transporte", -250],
      ["Pão de Açúcar", "mercado", -680],
      ["Apple.com/BR", "assinaturas", -49.9],
      ["Aluguel", "casa", -3200],
    ],
  },
  {
    year: 2026,
    month: 3,
    salary: 14500,
    expenses: [
      ["iFood", "alimentacao", -580],
      ["Carrefour", "mercado", -1050],
      ["Uber", "transporte", -340],
      ["Netflix", "streaming", -55.9],
      ["Smart Fit", "saude", -119.9],
      ["Outback", "alimentacao", -480],
      ["Amazon", "casa", -490],
      ["Drogasil", "farmacia", -210],
      ["Spotify", "assinaturas", -34.9],
      ["Mercado Livre", "casa", -680],
      ["Cinemark", "lazer", -150],
      ["Shell Posto", "transporte", -230],
      ["Pão de Açúcar", "mercado", -640],
      ["Apple.com/BR", "assinaturas", -49.9],
      ["Aluguel", "casa", -3200],
    ],
  },
];

function generateHistoricalTransactions(): Transaction[] {
  const list: Transaction[] = [];
  historicalMonths.forEach((hm, monthIdx) => {
    list.push({
      id: `tx-hist-salary-${monthIdx}`,
      date: new Date(hm.year, hm.month, 5).toISOString(),
      merchant: "Salário",
      description: "CRÉDITO SALÁRIO",
      amount: hm.salary,
      categoryId: "salario",
      origin: "manual",
      status: "revisada",
    });
    hm.expenses.forEach((exp, i) => {
      const [merchant, categoryId, amount] = exp;
      list.push({
        id: `tx-hist-${monthIdx}-${i}`,
        date: new Date(hm.year, hm.month, (i % 25) + 1).toISOString(),
        merchant,
        description: merchant.toUpperCase() + " *COMPRA",
        amount,
        categoryId,
        cardId: "santander-unique",
        origin: merchant === "Aluguel" ? "recorrente" : "fatura",
        status: "revisada",
      });
    });
  });
  return list;
}

export const seedTransactions: Transaction[] = [
  ...generateHistoricalTransactions(),
  ...generateMayTransactions(),
];

// ── Database Seeding ──────────────────────────────────────────────────────────

/**
 * Seeds the database with default data if it is empty.
 * Idempotent — safe to call on every app startup.
 */
export async function seedDatabaseIfEmpty(): Promise<void> {
  const existing = await db.categories.list();
  if (existing.length > 0) return; // already seeded

  await Promise.all([
    db.categories.bulkCreate(seedCategories),
    db.settings.save(defaultSettings),
  ]);
}
