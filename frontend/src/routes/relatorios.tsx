import { createFileRoute } from "@tanstack/react-router";
import {
  Download, FileJson, FileSpreadsheet, BarChart3,
  PieChart as PieIcon, LineChart as LineIcon, CreditCard, Store,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { SectionTitle, Stat } from "@/components/ui-bits";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useAppData } from "@/state/app-data-context";
import { computeCategorySpend, computeMonthlyTrend, computeTopMerchants } from "@/lib/selectors";
import { brl } from "@/lib/format";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Caderneta" }] }),
  component: Relatorios,
});

type TabId  = "periodo" | "categorias" | "cartoes" | "estabelecimentos";
type Period = "3" | "6" | "12";

const CHART_TOOLTIP = {
  contentStyle: {
    background: "oklch(0.22 0.02 260)",
    border: "1px solid oklch(1 0 0 / 10%)",
    borderRadius: 12,
    fontSize: 12,
  },
} as const;

function Relatorios() {
  const { transactions, categories, cards } = useAppData();
  const [tab, setTab]       = useState<TabId>("periodo");
  const [period, setPeriod] = useState<Period>("6");
  const monthCount = parseInt(period);

  // All transactions within the selected period window
  const periodTxs = useMemo(() => {
    const now    = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);
    return transactions.filter((t) => new Date(t.date) >= cutoff);
  }, [transactions, monthCount]);

  const monthlyTrend  = useMemo(() => computeMonthlyTrend(transactions, monthCount), [transactions, monthCount]);
  const categorySpend = useMemo(() => computeCategorySpend(periodTxs, categories), [periodTxs, categories]);
  const topMerchants  = useMemo(() => computeTopMerchants(periodTxs, 10), [periodTxs]);

  // Period KPIs
  const totalExpenses = useMemo(
    () => Math.abs(periodTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0)),
    [periodTxs],
  );
  const totalIncome = useMemo(
    () => periodTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0),
    [periodTxs],
  );

  // Card breakdown
  const cardBreakdown = useMemo(
    () =>
      cards
        .map((card) => {
          const txs   = periodTxs.filter((t) => t.cardId === card.id && t.amount < 0);
          const total = Math.abs(txs.reduce((s, t) => s + t.amount, 0));
          return { ...card, total, count: txs.length };
        })
        .filter((c) => c.count > 0)
        .sort((a, b) => b.total - a.total),
    [cards, periodTxs],
  );

  const monthlyTable   = useMemo(
    () => monthlyTrend.map((p) => ({ ...p, saldo: p.receitas - p.despesas })),
    [monthlyTrend],
  );
  const totalCatSpend = categorySpend.reduce((s, c) => s + c.spent, 0);

  // ── Exports ────────────────────────────────────────────────────────────────
  function exportCSV() {
    const header = ["Data", "Estabelecimento", "Descrição", "Categoria", "Valor (R$)", "Cartão"].join(",");
    const rows = [...periodTxs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) =>
        [
          t.date,
          `"${t.merchant.replace(/"/g, '""')}"`,
          `"${t.description.replace(/"/g, '""')}"`,
          `"${categories.find((c) => c.id === t.categoryId)?.name ?? ""}"`,
          t.amount.toFixed(2),
          `"${cards.find((c) => c.id === t.cardId)?.name ?? "Manual"}"`,
        ].join(","),
      );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `transacoes-${period}m.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function exportJSON() {
    const data = [...periodTxs]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => ({
        ...t,
        categoryName: categories.find((c) => c.id === t.categoryId)?.name,
        cardName:     cards.find((c) => c.id === t.cardId)?.name ?? "Manual",
      }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `transacoes-${period}m.json`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── Tab / period config ────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: typeof BarChart3 }[] = [
    { id: "periodo",          label: "Por período",         icon: LineIcon   },
    { id: "categorias",       label: "Por categoria",       icon: PieIcon    },
    { id: "cartoes",          label: "Por cartão",          icon: CreditCard },
    { id: "estabelecimentos", label: "Por estabelecimento", icon: Store      },
  ];

  const PERIODS: { value: Period; label: string }[] = [
    { value: "3",  label: "3 meses"  },
    { value: "6",  label: "6 meses"  },
    { value: "12", label: "12 meses" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Visualizações detalhadas e exportações dos seus dados financeiros."
        actions={
          <>
            <button onClick={exportCSV} className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5 transition">
              <FileSpreadsheet className="size-4" /> CSV
            </button>
            <button onClick={exportJSON} className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5 transition">
              <FileJson className="size-4" /> JSON
            </button>
            <button onClick={() => window.print()} className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90 transition">
              <Download className="size-4" /> PDF
            </button>
          </>
        }
      />

      {/* Filter bar */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition flex items-center gap-1.5",
                tab === t.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "glass-soft hover:bg-accent/40 text-muted-foreground",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[12px] transition",
                  period === p.value
                    ? "glass text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Receitas" value={brl(totalIncome)} accent="positive" hint={`Últimos ${period} meses`} />
        <Stat label="Despesas" value={brl(totalExpenses)} accent="negative" hint={`${periodTxs.filter(t => t.amount < 0).length} transações`} />
        <Stat
          label="Saldo"
          value={brl(totalIncome - totalExpenses)}
          accent={totalIncome >= totalExpenses ? "positive" : "negative"}
        />
      </div>

      {/* ── TAB: Período ──────────────────────────────────────────────────────── */}
      {tab === "periodo" && (
        <>
          <GlassCard>
            <SectionTitle title="Receitas vs Despesas" hint={`Últimos ${period} meses`} action={<LineIcon className="size-4 text-muted-foreground" />} />
            <div className="h-72 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyTrend}>
                  <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                  <XAxis dataKey="month" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(v)} />
                  <Bar dataKey="despesas" name="Despesas" fill="oklch(0.72 0.16 255)" radius={[4, 4, 0, 0]} barSize={16} />
                  <Line type="monotone" dataKey="receitas" name="Receitas" stroke="oklch(0.72 0.16 158)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.16 158)" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <SectionTitle title="Resumo mensal" />
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-glass-border text-muted-foreground text-[11px] uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Mês</th>
                    <th className="text-right py-2 px-4">Receitas</th>
                    <th className="text-right py-2 px-4">Despesas</th>
                    <th className="text-right py-2 pl-4">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyTable.map((row) => (
                    <tr key={row.month} className="border-b border-glass-border/50 hover:bg-accent/10 transition">
                      <td className="py-2.5 pr-4 font-medium">{row.month}</td>
                      <td className="py-2.5 px-4 tabular-nums text-right text-[var(--positive)]">{brl(row.receitas)}</td>
                      <td className="py-2.5 px-4 tabular-nums text-right text-[var(--negative)]">{brl(row.despesas)}</td>
                      <td className={cn("py-2.5 pl-4 tabular-nums text-right font-medium", row.saldo >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]")}>
                        {brl(row.saldo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {/* ── TAB: Categorias ───────────────────────────────────────────────────── */}
      {tab === "categorias" && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <GlassCard>
              <SectionTitle title="Composição" action={<PieIcon className="size-4 text-muted-foreground" />} />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpend.filter((c) => c.spent > 0).slice(0, 8)}
                      dataKey="spent" nameKey="name"
                      outerRadius={80} innerRadius={36}
                      stroke="none"
                    >
                      {categorySpend.filter((c) => c.spent > 0).slice(0, 8).map((c, i) => (
                        <Cell key={i} fill={c.color ?? `oklch(0.72 0.16 ${(i * 45) % 360})`} />
                      ))}
                    </Pie>
                    <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard className="lg:col-span-2">
              <SectionTitle title="Por categoria" action={<BarChart3 className="size-4 text-muted-foreground" />} />
              <div className="h-64 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categorySpend.filter((c) => c.spent > 0).slice(0, 8)}>
                    <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                    <XAxis dataKey="name" stroke="oklch(0.68 0.018 255)" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(v)} />
                    <Bar dataKey="spent" radius={[6, 6, 0, 0]} barSize={28}>
                      {categorySpend.filter((c) => c.spent > 0).slice(0, 8).map((c, i) => (
                        <Cell key={i} fill={c.color ?? `oklch(0.72 0.16 ${(i * 45) % 360})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>

          <GlassCard>
            <SectionTitle title="Detalhamento por categoria" />
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-glass-border text-muted-foreground text-[11px] uppercase tracking-wider">
                    <th className="text-left py-2 pr-4">Categoria</th>
                    <th className="text-right py-2 px-4">Total gasto</th>
                    <th className="text-right py-2 px-4">% do total</th>
                    <th className="text-right py-2 px-4">Transações</th>
                    <th className="text-right py-2 pl-4">Orçamento</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySpend.filter((c) => c.spent > 0).map((c) => {
                    const pct  = totalCatSpend > 0 ? (c.spent / totalCatSpend) * 100 : 0;
                    const over = c.budget && c.spent > c.budget;
                    return (
                      <tr key={c.id} className="border-b border-glass-border/50 hover:bg-accent/10 transition">
                        <td className="py-2.5 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                            <span>{c.icon}</span>
                            <span>{c.name}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4 tabular-nums text-right font-medium">{brl(c.spent)}</td>
                        <td className="py-2.5 px-4 tabular-nums text-right text-muted-foreground">{pct.toFixed(1)}%</td>
                        <td className="py-2.5 px-4 tabular-nums text-right text-muted-foreground">{c.count}</td>
                        <td className={cn("py-2.5 pl-4 tabular-nums text-right", over ? "text-[var(--negative)]" : "text-muted-foreground")}>
                          {c.budget ? brl(c.budget) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {/* ── TAB: Cartões ──────────────────────────────────────────────────────── */}
      {tab === "cartoes" && (
        cardBreakdown.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
            Nenhuma transação por cartão neste período.
          </div>
        ) : (
          <>
            <GlassCard>
              <SectionTitle title="Gasto por cartão" action={<BarChart3 className="size-4 text-muted-foreground" />} />
              <div className="h-64 -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cardBreakdown}>
                    <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                    <XAxis dataKey="name" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(v)} />
                    <Bar dataKey="total" name="Gasto" fill="oklch(0.72 0.16 255)" radius={[6, 6, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <SectionTitle title="Detalhamento por cartão" />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-glass-border text-muted-foreground text-[11px] uppercase tracking-wider">
                      <th className="text-left py-2 pr-4">Cartão</th>
                      <th className="text-right py-2 px-4">Total gasto</th>
                      <th className="text-right py-2 px-4">Transações</th>
                      <th className="text-right py-2 px-4">Limite</th>
                      <th className="text-right py-2 pl-4">Uso do limite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cardBreakdown.map((c) => {
                      const usoPct = c.limit > 0 ? (c.total / c.limit) * 100 : null;
                      return (
                        <tr key={c.id} className="border-b border-glass-border/50 hover:bg-accent/10 transition">
                          <td className="py-2.5 pr-4 font-medium">{c.name}</td>
                          <td className="py-2.5 px-4 tabular-nums text-right">{brl(c.total)}</td>
                          <td className="py-2.5 px-4 tabular-nums text-right text-muted-foreground">{c.count}</td>
                          <td className="py-2.5 px-4 tabular-nums text-right text-muted-foreground">{c.limit > 0 ? brl(c.limit) : "—"}</td>
                          <td className={cn("py-2.5 pl-4 tabular-nums text-right", usoPct && usoPct > 80 ? "text-[var(--negative)]" : "text-muted-foreground")}>
                            {usoPct !== null ? `${usoPct.toFixed(1)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )
      )}

      {/* ── TAB: Estabelecimentos ─────────────────────────────────────────────── */}
      {tab === "estabelecimentos" && (
        topMerchants.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
            Nenhuma despesa neste período.
          </div>
        ) : (
          <>
            <GlassCard>
              <SectionTitle title="Top estabelecimentos" hint={`Últimos ${period} meses`} action={<Store className="size-4 text-muted-foreground" />} />
              <div className="h-80 -ml-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topMerchants} layout="vertical">
                    <CartesianGrid stroke="oklch(1 0 0 / 5%)" horizontal={false} />
                    <XAxis type="number" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} width={120} />
                    <Tooltip {...CHART_TOOLTIP} formatter={(v: number) => brl(v)} />
                    <Bar dataKey="total" name="Total" fill="oklch(0.72 0.16 255)" radius={[0, 6, 6, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard>
              <SectionTitle title="Detalhamento por estabelecimento" />
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-glass-border text-muted-foreground text-[11px] uppercase tracking-wider">
                      <th className="text-left py-2 pr-2 w-8">#</th>
                      <th className="text-left py-2 pr-4">Estabelecimento</th>
                      <th className="text-right py-2 px-4">Total</th>
                      <th className="text-right py-2 px-4">Transações</th>
                      <th className="text-right py-2 pl-4">Ticket médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topMerchants.map((m, i) => (
                      <tr key={m.name} className="border-b border-glass-border/50 hover:bg-accent/10 transition">
                        <td className="py-2.5 pr-2 text-muted-foreground tabular-nums text-[11px]">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-medium">{m.name}</td>
                        <td className="py-2.5 px-4 tabular-nums text-right">{brl(m.total)}</td>
                        <td className="py-2.5 px-4 tabular-nums text-right text-muted-foreground">{m.count}</td>
                        <td className="py-2.5 pl-4 tabular-nums text-right text-muted-foreground">{brl(m.total / m.count)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )
      )}
    </div>
  );
}
