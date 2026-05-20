// Mock data realistic for a Brazilian personal finance app
export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  budget?: number;
};

export const categories: Category[] = [
  { id: "alimentacao", name: "Alimentação", icon: "🍽️", color: "oklch(0.72 0.16 30)", budget: 1800 },
  { id: "mercado", name: "Mercado", icon: "🛒", color: "oklch(0.72 0.16 158)", budget: 1500 },
  { id: "transporte", name: "Transporte", icon: "🚗", color: "oklch(0.72 0.16 255)", budget: 600 },
  { id: "streaming", name: "Streaming", icon: "🎬", color: "oklch(0.74 0.16 305)", budget: 200 },
  { id: "farmacia", name: "Farmácia", icon: "💊", color: "oklch(0.7 0.16 15)", budget: 300 },
  { id: "assinaturas", name: "Assinaturas", icon: "🔁", color: "oklch(0.74 0.14 280)", budget: 250 },
  { id: "saude", name: "Saúde", icon: "❤️", color: "oklch(0.66 0.2 18)", budget: 400 },
  { id: "lazer", name: "Lazer", icon: "🎭", color: "oklch(0.78 0.15 75)", budget: 500 },
  { id: "casa", name: "Casa", icon: "🏠", color: "oklch(0.7 0.12 200)", budget: 800 },
  { id: "educacao", name: "Educação", icon: "📚", color: "oklch(0.72 0.14 230)", budget: 350 },
];

export type Card = {
  id: string;
  name: string;
  bank: string;
  brand: "Visa" | "Mastercard" | "Elo";
  last4: string;
  limit: number;
  used: number;
  closingDay: number;
  dueDay: number;
  gradient: string;
  primary?: boolean;
};

export const cards: Card[] = [
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

export type Tx = {
  id: string;
  date: string; // ISO
  merchant: string;
  description: string;
  amount: number; // negative = despesa
  categoryId: string;
  cardId?: string;
  origin: "fatura" | "manual" | "recorrente" | "ajuste";
  installment?: { current: number; total: number };
  status: "revisada" | "pendente" | "ignorada";
  tags?: string[];
  note?: string;
  starred?: boolean;
};

const merchants = [
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
  ["Disney Plus", "streaming"],
  ["Outback", "alimentacao"],
  ["Drogasil", "farmacia"],
  ["Magazine Luiza", "casa"],
] as const;

function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export const transactions: Tx[] = (() => {
  const r = rand(42);
  const list: Tx[] = [];
  for (let i = 0; i < 60; i++) {
    const m = merchants[Math.floor(r() * merchants.length)];
    const day = Math.max(1, Math.floor(r() * 20) + 1);
    const date = new Date(2026, 4, day).toISOString();
    const amount = -Math.round((r() * 380 + 18) * 100) / 100;
    const hasInst = r() > 0.78;
    list.push({
      id: `tx-${i}`,
      date,
      merchant: m[0],
      description: m[0].toUpperCase() + " *PARCELA",
      amount,
      categoryId: m[1],
      cardId: r() > 0.5 ? "santander-unique" : r() > 0.5 ? "santander-unlimited" : "nubank",
      origin: r() > 0.3 ? "fatura" : r() > 0.5 ? "manual" : "recorrente",
      installment: hasInst
        ? { current: Math.floor(r() * 6) + 1, total: Math.floor(r() * 6) + 6 }
        : undefined,
      status: r() > 0.25 ? "revisada" : "pendente",
      starred: r() > 0.9,
    });
  }
  // a few incomes
  list.push({
    id: "tx-salary",
    date: new Date(2026, 4, 5).toISOString(),
    merchant: "Salário",
    description: "CRÉDITO SALÁRIO",
    amount: 14500,
    categoryId: "casa",
    origin: "manual",
    status: "revisada",
  });
  return list.sort((a, b) => +new Date(b.date) - +new Date(a.date));
})();

export const monthlyTrend = [
  { month: "Dez", despesas: 8420, receitas: 14000 },
  { month: "Jan", despesas: 9120, receitas: 14000 },
  { month: "Fev", despesas: 7980, receitas: 14000 },
  { month: "Mar", despesas: 10240, receitas: 14500 },
  { month: "Abr", despesas: 9870, receitas: 14500 },
  { month: "Mai", despesas: 11340, receitas: 14500 },
];

export type Goal = {
  id: string;
  name: string;
  target: number;
  current: number;
  deadline: string;
  icon: string;
};

export const goals: Goal[] = [
  { id: "1", name: "Reserva de Emergência", target: 30000, current: 18450, deadline: "2026-12-31", icon: "🛟" },
  { id: "2", name: "Viagem Japão", target: 22000, current: 7820, deadline: "2027-03-15", icon: "🗾" },
  { id: "3", name: "MacBook Pro", target: 18000, current: 14200, deadline: "2026-08-30", icon: "💻" },
  { id: "4", name: "Quitar Cartão", target: 12000, current: 9300, deadline: "2026-07-30", icon: "💳" },
];

export type Recurrence = {
  id: string;
  name: string;
  amount: number;
  periodicity: "Semanal" | "Quinzenal" | "Mensal" | "Anual";
  next: string;
  categoryId: string;
  enabled: boolean;
  type: "despesa" | "receita";
};

export const recurrences: Recurrence[] = [
  { id: "r1", name: "Netflix Premium", amount: 55.9, periodicity: "Mensal", next: "2026-05-22", categoryId: "streaming", enabled: true, type: "despesa" },
  { id: "r2", name: "Spotify Family", amount: 34.9, periodicity: "Mensal", next: "2026-05-24", categoryId: "assinaturas", enabled: true, type: "despesa" },
  { id: "r3", name: "Internet Vivo Fibra", amount: 149.9, periodicity: "Mensal", next: "2026-05-28", categoryId: "casa", enabled: true, type: "despesa" },
  { id: "r4", name: "Aluguel", amount: 3200, periodicity: "Mensal", next: "2026-06-05", categoryId: "casa", enabled: true, type: "despesa" },
  { id: "r5", name: "Salário", amount: 14500, periodicity: "Mensal", next: "2026-06-05", categoryId: "casa", enabled: true, type: "receita" },
  { id: "r6", name: "Smart Fit", amount: 119.9, periodicity: "Mensal", next: "2026-05-30", categoryId: "saude", enabled: true, type: "despesa" },
  { id: "r7", name: "iCloud 2TB", amount: 49.9, periodicity: "Mensal", next: "2026-06-02", categoryId: "assinaturas", enabled: false, type: "despesa" },
];

export type Statement = {
  id: string;
  cardId: string;
  reference: string; // "Maio de 2026"
  closingDate: string;
  dueDate: string;
  total: number;
  minimum: number;
  itemsCount: number;
  status: "importada" | "pendente" | "erro" | "duplicada";
};

export const statements: Statement[] = [
  { id: "s1", cardId: "santander-unique", reference: "Maio de 2026", closingDate: "2026-05-15", dueDate: "2026-05-22", total: 4820.55, minimum: 720.18, itemsCount: 34, status: "pendente" },
  { id: "s2", cardId: "santander-unique", reference: "Abril de 2026", closingDate: "2026-04-15", dueDate: "2026-04-22", total: 3920.4, minimum: 588.06, itemsCount: 28, status: "importada" },
  { id: "s3", cardId: "santander-unlimited", reference: "Maio de 2026", closingDate: "2026-05-05", dueDate: "2026-05-12", total: 2480.18, minimum: 372.02, itemsCount: 19, status: "importada" },
  { id: "s4", cardId: "nubank", reference: "Maio de 2026", closingDate: "2026-05-20", dueDate: "2026-05-27", total: 1820.0, minimum: 273.0, itemsCount: 14, status: "importada" },
  { id: "s5", cardId: "santander-unique", reference: "Março de 2026", closingDate: "2026-03-15", dueDate: "2026-03-22", total: 5120.7, minimum: 768.1, itemsCount: 41, status: "importada" },
];

export const categorySpend = categories
  .map((c) => ({
    ...c,
    spent: Math.abs(
      transactions
        .filter((t) => t.categoryId === c.id && t.amount < 0)
        .reduce((s, t) => s + t.amount, 0),
    ),
    count: transactions.filter((t) => t.categoryId === c.id).length,
  }))
  .sort((a, b) => b.spent - a.spent);

export const topMerchants = (() => {
  const map = new Map<string, { name: string; total: number; count: number }>();
  transactions
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const cur = map.get(t.merchant) ?? { name: t.merchant, total: 0, count: 0 };
      cur.total += Math.abs(t.amount);
      cur.count += 1;
      map.set(t.merchant, cur);
    });
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 8);
})();

export const totals = {
  expenses: Math.abs(transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
  income: transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
  cardSpend: Math.abs(
    transactions.filter((t) => t.amount < 0 && t.cardId).reduce((s, t) => s + t.amount, 0),
  ),
  manualSpend: Math.abs(
    transactions.filter((t) => t.amount < 0 && !t.cardId).reduce((s, t) => s + t.amount, 0),
  ),
};

export const imports = [
  { id: "i1", file: "santander_unique_05_2026.pdf", date: "2026-05-16T09:24:00", origin: "Santander", items: 34, errors: 0, duplicates: 0, status: "Concluída" },
  { id: "i2", file: "santander_unlimited_05_2026.pdf", date: "2026-05-06T18:01:00", origin: "Santander", items: 19, errors: 0, duplicates: 1, status: "Concluída" },
  { id: "i3", file: "nubank_05_2026.pdf", date: "2026-05-21T11:11:00", origin: "Nubank", items: 14, errors: 0, duplicates: 0, status: "Concluída" },
  { id: "i4", file: "santander_unique_04_2026.pdf", date: "2026-04-16T08:00:00", origin: "Santander", items: 28, errors: 2, duplicates: 0, status: "Revisão necessária" },
];
