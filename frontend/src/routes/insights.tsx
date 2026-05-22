import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingDown, TrendingUp, Sparkles, AlertTriangle,
  Repeat, BarChart3, ChevronLeft, ChevronRight, Wallet,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, Stat } from "@/components/ui-bits";
import {
  Bar, CartesianGrid, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAppData } from "@/state/app-data-context";
import { computeCategorySpend, computeMonthlyTrend, computeTopMerchants, filterByMonth } from "@/lib/selectors";
import { brl, toMonthly } from "@/lib/format";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Insights • GS" }] }),
  component: Insights,
});

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function glowColor(tone: string): string {
  switch (tone) {
    case "warning":  return "oklch(0.85 0.22 84)";
    case "negative": return "oklch(0.72 0.22 20)";
    case "positive": return "oklch(0.75 0.20 145)";
    case "info":     return "var(--info)";
    default:         return "oklch(0.68 0.018 255)";
  }
}

function Insights() {
  const { transactions, categories, goals, cards, recurring } = useAppData();
  const [monthOffset, setMonthOffset] = useState(0);

  const viewDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const currentMonth = useMemo(
    () => filterByMonth(transactions, viewDate.getFullYear(), viewDate.getMonth()),
    [transactions, viewDate],
  );

  const prevMonth = useMemo(() => {
    const prev = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    return filterByMonth(transactions, prev.getFullYear(), prev.getMonth());
  }, [transactions, viewDate]);

  const categorySpend = useMemo(
    () => computeCategorySpend(currentMonth, categories),
    [currentMonth, categories],
  );
  const prevCategorySpend = useMemo(
    () => computeCategorySpend(prevMonth, categories),
    [prevMonth, categories],
  );
  const monthlyTrend = useMemo(() => computeMonthlyTrend(transactions), [transactions]);
  const topMerchants = useMemo(() => computeTopMerchants(currentMonth), [currentMonth]);

  // KPIs
  const expenses = useMemo(
    () => Math.abs(currentMonth.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [currentMonth],
  );
  const income = useMemo(
    () => currentMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [currentMonth],
  );
  const prevExpenses = useMemo(
    () => Math.abs(prevMonth.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [prevMonth],
  );
  const prevIncome = useMemo(
    () => prevMonth.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [prevMonth],
  );
  const net = income - expenses;
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const expenseChange = prevExpenses > 0 ? ((expenses - prevExpenses) / prevExpenses) * 100 : 0;
  const incomeChange  = prevIncome  > 0 ? ((income  - prevIncome)  / prevIncome)  * 100 : 0;

  // Recurring
  const enabledRecurring = useMemo(() => recurring.filter((r) => r.enabled), [recurring]);
  const recurringMonthly = useMemo(
    () => enabledRecurring.filter((r) => r.type === "despesa").reduce((s, r) => s + toMonthly(r.amount, r.periodicity), 0),
    [enabledRecurring],
  );

  // Biggest category increase vs last month
  const biggestIncrease = useMemo(() => {
    let max: { name: string; delta: number; pct: number } | null = null;
    for (const cat of categorySpend) {
      const prev = prevCategorySpend.find((c) => c.id === cat.id)?.spent ?? 0;
      if (prev > 0 && cat.spent > prev) {
        const delta = cat.spent - prev;
        const pct   = (delta / prev) * 100;
        if (!max || pct > max.pct) max = { name: cat.name, delta, pct };
      }
    }
    return max;
  }, [categorySpend, prevCategorySpend]);

  type InsightItem = {
    tone: "warning" | "info" | "negative" | "positive" | "neutral";
    icon: typeof TrendingUp;
    title: string;
    text: string;
  };

  const insights = useMemo<InsightItem[]>(() => {
    const list: InsightItem[] = [];

    // Expense change vs last month
    if (prevExpenses > 0) {
      if (expenseChange > 15) {
        list.push({
          tone: "warning", icon: TrendingUp,
          title: `Gastos +${expenseChange.toFixed(0)}% vs mês anterior`,
          text: `Você gastou ${brl(expenses - prevExpenses)} a mais em comparação ao mês anterior.`,
        });
      } else if (expenseChange < -10) {
        list.push({
          tone: "positive", icon: TrendingDown,
          title: `Gastos reduzidos em ${Math.abs(expenseChange).toFixed(0)}%`,
          text: `Ótimo! Você economizou ${brl(prevExpenses - expenses)} em relação ao mês passado.`,
        });
      }
    }

    // Category over budget
    const overBudget = categorySpend.find((c) => c.budget && c.spent > c.budget * 0.85);
    if (overBudget) {
      const pct = Math.round((overBudget.spent / (overBudget.budget ?? 1)) * 100);
      list.push({
        tone: "warning", icon: AlertTriangle,
        title: `${overBudget.name} em ${pct}% do orçamento`,
        text: `Você usou ${brl(overBudget.spent)} de ${brl(overBudget.budget!)} disponíveis.`,
      });
    }

    // Card near limit
    const nearLimit = cards.find((c) => c.limit > 0 && c.used / c.limit >= 0.8);
    if (nearLimit) {
      const pct = Math.round((nearLimit.used / nearLimit.limit) * 100);
      list.push({
        tone: "negative", icon: AlertTriangle,
        title: `Cartão ${nearLimit.name} em ${pct}% do limite`,
        text: `${nearLimit.name} consumiu ${brl(nearLimit.used)} de ${brl(nearLimit.limit)} disponíveis.`,
      });
    }

    // Goal nearing completion
    const closeGoal = goals.find((g) => g.status === "active" && g.current / g.target >= 0.7);
    if (closeGoal) {
      const pct = Math.round((closeGoal.current / closeGoal.target) * 100);
      list.push({
        tone: "positive", icon: TrendingUp,
        title: `Meta "${closeGoal.name}" em ${pct}%`,
        text: `Faltam apenas ${brl(closeGoal.target - closeGoal.current)} para completar esta meta.`,
      });
    }

    // Savings rate
    if (income > 0) {
      const tone = savingsRate >= 20 ? "positive" : savingsRate >= 10 ? "info" : "warning";
      list.push({
        tone, icon: Wallet,
        title: `Taxa de poupança: ${savingsRate.toFixed(0)}%`,
        text: savingsRate >= 20
          ? `Excelente! Você poupou ${brl(net)} este mês.`
          : `Você poupou ${brl(Math.max(net, 0))}. Reduza gastos para melhorar a taxa.`,
      });
    }

    // Biggest category increase
    if (biggestIncrease && biggestIncrease.pct > 25 && list.length < 6) {
      list.push({
        tone: "info", icon: BarChart3,
        title: `${biggestIncrease.name} subiu ${biggestIncrease.pct.toFixed(0)}%`,
        text: `Gasto em ${biggestIncrease.name} aumentou ${brl(biggestIncrease.delta)} vs mês anterior.`,
      });
    }

    // Top merchant spotlight
    if (topMerchants[0] && list.length < 6) {
      list.push({
        tone: "neutral", icon: Sparkles,
        title: `${topMerchants[0].name} em destaque`,
        text: `Maior estabelecimento este mês: ${topMerchants[0].count} transaç${topMerchants[0].count === 1 ? "ão" : "ões"} totalizando ${brl(topMerchants[0].total)}.`,
      });
    }

    // Recurring commitment
    if (recurringMonthly > 0 && list.length < 6) {
      list.push({
        tone: "neutral", icon: Repeat,
        title: `${brl(recurringMonthly)}/mês comprometido`,
        text: `Recorrências ativas consomem ${brl(recurringMonthly)} todo mês em despesas fixas.`,
      });
    }

    return list.slice(0, 6);
  }, [
    categorySpend, goals, cards, expenses, income, net,
    prevExpenses, savingsRate, biggestIncrease, expenseChange,
    topMerchants, recurringMonthly,
  ]);

  const monthLabel    = `${MONTH_NAMES[viewDate.getMonth()]} ${viewDate.getFullYear()}`;
  const isCurrentMonth = monthOffset === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Insights"
        subtitle="Padrões, alertas e descobertas automáticas."
        actions={
          <div className="flex items-center gap-1 glass rounded-xl px-1 py-1">
            <button
              onClick={() => setMonthOffset((v) => v - 1)}
              className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center transition"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-[13px] font-medium px-2 min-w-[150px] text-center">{monthLabel}</span>
            <button
              onClick={() => setMonthOffset((v) => v + 1)}
              disabled={isCurrentMonth}
              className="size-7 rounded-lg hover:bg-accent/40 disabled:opacity-30 grid place-items-center transition"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Gastos"
          value={brl(expenses)}
          delta={prevExpenses > 0 ? `${expenseChange >= 0 ? "+" : ""}${expenseChange.toFixed(1)}%` : undefined}
          hint={prevExpenses > 0 ? "vs mês anterior" : undefined}
          accent={expenseChange > 15 ? "negative" : expenseChange < -10 ? "positive" : "default"}
        />
        <Stat
          label="Receitas"
          value={brl(income)}
          delta={prevIncome > 0 ? `${incomeChange >= 0 ? "+" : ""}${incomeChange.toFixed(1)}%` : undefined}
          hint={prevIncome > 0 ? "vs mês anterior" : undefined}
          accent="positive"
        />
        <Stat
          label="Saldo líquido"
          value={brl(net)}
          accent={net >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Taxa de poupança"
          value={income > 0 ? `${savingsRate.toFixed(0)}%` : "—"}
          hint={income > 0
            ? savingsRate >= 20 ? "Ótima poupança" : savingsRate >= 10 ? "Razoável" : "Abaixo do ideal"
            : "Sem receitas"}
          accent={savingsRate >= 20 ? "positive" : savingsRate >= 10 ? "default" : income > 0 ? "warning" : "default"}
        />
      </div>

      {/* Insight alerts */}
      {insights.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
          Adicione transações, cartões e metas para ver seus insights aqui.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((ins, idx) => {
            const Icon  = ins.icon;
            const color = glowColor(ins.tone);
            const label = ins.tone === "warning"  ? "Atenção"
                        : ins.tone === "negative" ? "Alerta"
                        : ins.tone === "positive" ? "Ótimo"
                        : ins.tone === "info"     ? "Info"
                        : "Nota";
            return (
              <GlassCard key={idx} className="relative overflow-hidden">
                <div className="absolute -top-12 -right-12 size-32 rounded-full blur-2xl opacity-20" style={{ background: color }} />
                <div className="size-10 rounded-2xl glass-soft grid place-items-center mb-3">
                  <Icon className="size-4" style={{ color }} />
                </div>
                <Pill tone={ins.tone}>{label}</Pill>
                <div className="text-[14px] font-semibold mt-2 mb-1">{ins.title}</div>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">{ins.text}</p>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title="Evolução mensal" hint="Despesas (barras) e receitas (linha) — 6 meses" />
          <div className="h-64 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyTrend}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => brl(v)}
                />
                <Bar dataKey="despesas" name="Despesas" fill="oklch(0.72 0.16 255)" radius={[6, 6, 0, 0]} barSize={18} />
                <Line dataKey="receitas" name="Receitas" stroke="oklch(0.76 0.18 150)" strokeWidth={2} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Top estabelecimentos" hint={monthLabel} />
          {topMerchants.length === 0 ? (
            <p className="text-[12px] text-muted-foreground py-4 text-center">Nenhuma despesa neste mês.</p>
          ) : (
            <div className="space-y-2">
              {topMerchants.slice(0, 6).map((m, i) => (
                <div key={m.name} className="flex items-center gap-2 text-[13px]">
                  <span className="w-5 text-muted-foreground tabular-nums text-[11px]">{i + 1}.</span>
                  <span className="flex-1 truncate">{m.name}</span>
                  <span className="tabular-nums text-muted-foreground">{brl(m.total)}</span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Category breakdown */}
      <GlassCard>
        <SectionTitle title="Gastos por categoria" hint={`${monthLabel} — progresso do orçamento`} />
        {categorySpend.filter((c) => c.spent > 0).length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-4 text-center">Nenhum gasto categorizado neste mês.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 mt-2">
            {categorySpend
              .filter((c) => c.spent > 0)
              .slice(0, 9)
              .map((c) => {
                const pct  = c.budget ? Math.min((c.spent / c.budget) * 100, 100) : null;
                const over = c.budget && c.spent > c.budget;
                return (
                  <div key={c.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12.5px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px]">{c.icon}</span>
                        <span className="truncate max-w-[110px]">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("tabular-nums font-medium", over && "text-[var(--negative)]")}>{brl(c.spent)}</span>
                        {c.budget && <span className="text-[11px] text-muted-foreground">/ {brl(c.budget)}</span>}
                      </div>
                    </div>
                    {pct !== null && (
                      <div className="h-1.5 rounded-full bg-glass-border overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: over ? "var(--negative)" : (c.color ?? "oklch(0.72 0.16 255)") }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </GlassCard>

      {/* Recurring summary */}
      {enabledRecurring.length > 0 && (
        <GlassCard>
          <SectionTitle
            title="Recorrências ativas"
            hint={`Despesas fixas: ${brl(recurringMonthly)}/mês`}
          />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {enabledRecurring.slice(0, 6).map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <div key={r.id} className="flex items-center justify-between glass-soft rounded-xl px-3 py-2 text-[12.5px]">
                  <div className="flex items-center gap-2 min-w-0">
                    {cat && <span className="shrink-0">{cat.icon}</span>}
                    <span className="truncate">{r.name}</span>
                  </div>
                  <span className={cn("tabular-nums font-medium shrink-0 ml-2", r.type === "despesa" ? "text-[var(--negative)]" : "text-[var(--positive)]")}>
                    {r.type === "despesa" ? "−" : "+"}{brl(r.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
