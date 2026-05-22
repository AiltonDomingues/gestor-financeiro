import type { Category, CategoryRule, Transaction } from "../domain/types";

// ── Totals ────────────────────────────────────────────────────────────────────

export type Totals = {
  income: number;
  freeIncome: number;    // income from non-restricted categories (freely disposable)
  benefits: number;      // income from restricted categories (Vale Alimentação, etc.)
  expenses: number;
  cardSpend: number;
  manualSpend: number;
};

export function computeTotals(transactions: Transaction[], categories: Category[] = []): Totals {
  const restrictedIds = new Set(categories.filter((c) => c.restricted).map((c) => c.id));
  const incomeTxs = transactions.filter((t) => t.amount > 0);
  const income = incomeTxs.reduce((s, t) => s + t.amount, 0);
  const benefits = incomeTxs
    .filter((t) => restrictedIds.has(t.categoryId))
    .reduce((s, t) => s + t.amount, 0);
  const freeIncome = income - benefits;
  const expenses = Math.abs(
    transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0),
  );
  const cardSpend = Math.abs(
    transactions
      .filter((t) => t.amount < 0 && !!t.cardId)
      .reduce((s, t) => s + t.amount, 0),
  );
  const manualSpend = Math.abs(
    transactions
      .filter((t) => t.amount < 0 && !t.cardId)
      .reduce((s, t) => s + t.amount, 0),
  );
  return { income, freeIncome, benefits, expenses, cardSpend, manualSpend };
}

// ── Category Spend ────────────────────────────────────────────────────────────

export type CategorySpend = Category & { spent: number; count: number };

export function computeCategorySpend(
  transactions: Transaction[],
  categories: Category[],
): CategorySpend[] {
  return categories
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
}

// ── Monthly Trend ─────────────────────────────────────────────────────────────

export type MonthlyPoint = { month: string; despesas: number; receitas: number };

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function computeMonthlyTrend(
  transactions: Transaction[],
  monthCount = 6,
): MonthlyPoint[] {
  const now = new Date();
  const points: MonthlyPoint[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const txs = transactions.filter((t) => {
      const td = new Date(t.date);
      return td.getFullYear() === y && td.getMonth() === m;
    });
    const despesas = Math.abs(
      txs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0),
    );
    const receitas = txs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    points.push({ month: MONTH_LABELS[m], despesas, receitas });
  }
  return points;
}

// ── Top Merchants ─────────────────────────────────────────────────────────────

export type MerchantStat = { name: string; total: number; count: number };

export function computeTopMerchants(
  transactions: Transaction[],
  limit = 8,
): MerchantStat[] {
  const map = new Map<string, MerchantStat>();
  transactions
    .filter((t) => t.amount < 0)
    .forEach((t) => {
      const cur = map.get(t.merchant) ?? { name: t.merchant, total: 0, count: 0 };
      cur.total += Math.abs(t.amount);
      cur.count += 1;
      map.set(t.merchant, cur);
    });
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

// ── Filter by Month ───────────────────────────────────────────────────────────

export function filterByMonth(
  transactions: Transaction[],
  year: number,
  month: number, // 0-indexed
): Transaction[] {
  return transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

export function filterCurrentMonth(transactions: Transaction[]): Transaction[] {
  const now = new Date();
  return filterByMonth(transactions, now.getFullYear(), now.getMonth());
}

// ── Category Rule Resolver ────────────────────────────────────────────────────

/**
 * Returns the first matching categoryId from user-defined rules, or null.
 * Rules are evaluated in ascending priority order. Case-insensitive for all
 * match types except "regex" (which uses the /i flag).
 */
export function resolveCategory(
  description: string,
  rules: CategoryRule[],
): string | null {
  const enabled = rules
    .filter((r) => r.enabled)
    .sort((a, b) => a.priority - b.priority);

  for (const rule of enabled) {
    let matched = false;
    try {
      const hay = description.toLowerCase();
      const needle = rule.pattern.toLowerCase();
      switch (rule.matchType) {
        case "contains":   matched = hay.includes(needle); break;
        case "startsWith": matched = hay.startsWith(needle); break;
        case "exact":      matched = hay === needle; break;
        case "regex":      matched = new RegExp(rule.pattern, "i").test(description); break;
      }
    } catch {
      // invalid regex pattern — skip rule
    }
    if (matched) return rule.categoryId;
  }
  return null;
}
