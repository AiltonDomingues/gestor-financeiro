import { createFileRoute } from "@tanstack/react-router";
import { useAppData } from "@/state/app-data-context";
import { useState, useMemo } from "react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { SectionTitle, Stat } from "@/components/ui-bits";
import { brl } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction, Statement, Card, RecurringEntry } from "@/domain/types";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Activity, Calendar, CreditCard, Repeat, Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Period = "1" | "3" | "6";

type FlowPoint = {
  label: string;
  date: string;
  inflow: number;
  outflowNeg: number; // -outflow (draws bar downward)
  faturasNeg: number; // -faturas (draws bar downward, stacked)
  outflow: number;    // absolute — for table and tooltip
  faturas: number;    // absolute — for table and tooltip
  net: number;
  cumulative: number;
};

type UpcomingItem = {
  date: string;
  label: string;
  amount: number;   // positive = inflow, negative = outflow
  kind: "fatura" | "recorrente";
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Cash flow engine ──────────────────────────────────────────────────────────
//
// Regime de caixa:
//   - Transações de CRÉDITO (cardId + amount < 0) → NÃO contam no dia do lançamento.
//     O caixa é impactado no VENCIMENTO da fatura (Statement.dueDate).
//   - Receitas (amount > 0) → sempre contam no dia do lançamento.
//   - Transações SEM cartão (PIX, débito, manual) → contam no dia do lançamento.
//   - Statements → são o pagamento real da fatura, no seu dueDate.
//
function buildCashFlow(
  transactions: Transaction[],
  statements: Statement[],
  cards: Card[],
  recurring: RecurringEntry[],
  monthCount: number,
): { points: FlowPoint[]; upcoming: UpcomingItem[]; barSize: number } {
  const now = new Date();
  const todayStr = isoDate(now);
  const periodStart = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1), 1);
  const periodStartStr = isoDate(periodStart);

  // ── 1. Collect cash events ──────────────────────────────────────────────────
  type RawEvent = { date: string; amount: number; isFatura: boolean };
  const events: RawEvent[] = [];

  // Real cash transactions: income regardless of origin; expenses only if non-card
  transactions
    .filter((t) => t.date >= periodStartStr && t.date <= todayStr)
    .filter((t) => t.amount > 0 || !t.cardId)
    .forEach((t) => events.push({ date: t.date, amount: t.amount, isFatura: false }));

  // Card bill payments: each statement = one cash outflow on the due date
  statements
    .filter((s) => s.dueDate >= periodStartStr && s.dueDate <= todayStr)
    .forEach((s) => events.push({ date: s.dueDate, amount: -s.total, isFatura: true }));

  // ── 2. Aggregate by date ────────────────────────────────────────────────────
  const agg: Record<string, { inflow: number; outflow: number; faturas: number }> = {};
  const ensure = (d: string) => {
    if (!agg[d]) agg[d] = { inflow: 0, outflow: 0, faturas: 0 };
  };

  events.forEach(({ date, amount, isFatura }) => {
    ensure(date);
    if (amount > 0)      agg[date].inflow  += amount;
    else if (isFatura)   agg[date].faturas += Math.abs(amount);
    else                 agg[date].outflow += Math.abs(amount);
  });

  // ── 3. Build time buckets ───────────────────────────────────────────────────
  type Bucket = { startStr: string; endStr: string; label: string };
  const buckets: Bucket[] = [];
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (monthCount === 1) {
    // Daily view
    const d = new Date(periodStart);
    while (d <= todayDate) {
      const ds = isoDate(d);
      buckets.push({
        startStr: ds,
        endStr: ds,
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      });
      d.setDate(d.getDate() + 1);
    }
  } else if (monthCount === 3) {
    // Weekly view — fixed 7-day windows from period start
    const d = new Date(periodStart);
    while (d <= todayDate) {
      const weekEnd = new Date(d);
      weekEnd.setDate(weekEnd.getDate() + 6);
      buckets.push({
        startStr: isoDate(d),
        endStr: isoDate(weekEnd),
        label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      });
      d.setDate(d.getDate() + 7);
    }
  } else {
    // Monthly view
    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      buckets.push({
        startStr: isoDate(d),
        endStr: isoDate(end),
        label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      });
    }
  }

  // ── 4. Roll up events into buckets → compute running balance ───────────────
  let cumulative = 0;
  const points: FlowPoint[] = buckets.map((bucket) => {
    let inflow = 0, outflow = 0, faturas = 0;

    Object.entries(agg).forEach(([date, ev]) => {
      if (date >= bucket.startStr && date <= bucket.endStr) {
        inflow  += ev.inflow;
        outflow += ev.outflow;
        faturas += ev.faturas;
      }
    });

    const net = inflow - outflow - faturas;
    cumulative += net;

    return {
      label: bucket.label,
      date: bucket.startStr,
      inflow,
      outflowNeg: -(outflow),
      faturasNeg: -(faturas),
      outflow,
      faturas,
      net,
      cumulative,
    };
  });

  const barSize = monthCount === 1 ? 8 : monthCount === 3 ? 16 : 34;

  // ── 5. Upcoming 60 days ─────────────────────────────────────────────────────
  const future60 = new Date(now);
  future60.setDate(future60.getDate() + 60);
  const futureStr = isoDate(future60);

  const upcoming: UpcomingItem[] = [];

  // Unpaid/pending card statements
  statements
    .filter((s) => s.dueDate > todayStr && s.dueDate <= futureStr && s.status !== "paga")
    .forEach((s) => {
      const card = cards.find((c) => c.id === s.cardId);
      upcoming.push({
        date: s.dueDate,
        label: `Fatura ${card?.name ?? "Cartão"} — ${s.reference}`,
        amount: -s.total,
        kind: "fatura",
      });
    });

  // Enabled recurring entries projected forward
  // Exclude recurring paid by credit card — those will be part of the card bill
  recurring
    .filter((r) => r.enabled && r.paymentMethod !== "cartao")
    .forEach((r) => {
      let d = new Date(r.next + "T12:00:00");
      let safety = 0;
      while (isoDate(d) <= futureStr && safety < 52) {
        safety++;
        const ds = isoDate(d);
        if (ds > todayStr) {
          upcoming.push({
            date: ds,
            label: r.name,
            amount: r.type === "despesa" ? -Math.abs(r.amount) : Math.abs(r.amount),
            kind: "recorrente",
          });
        }
        switch (r.periodicity) {
          case "Semanal":   d.setDate(d.getDate() + 7);          break;
          case "Quinzenal": d.setDate(d.getDate() + 15);         break;
          case "Mensal":    d.setMonth(d.getMonth() + 1);        break;
          case "Anual":     d.setFullYear(d.getFullYear() + 1);  break;
        }
      }
    });

  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  return { points, upcoming, barSize };
}

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/fluxo")({
  head: () => ({ meta: [{ title: "Fluxo de Caixa — Caderneta" }] }),
  component: FluxoCaixa,
});

const CHART_TOOLTIP = {
  contentStyle: {
    background: "oklch(0.22 0.02 260)",
    border: "1px solid oklch(1 0 0 / 10%)",
    borderRadius: 12,
    fontSize: 12,
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

function FluxoCaixa() {
  const { transactions, statements, cards, recurring } = useAppData();
  const [period, setPeriod] = useState<Period>("3");
  const monthCount = parseInt(period);

  const { points, upcoming, barSize } = useMemo(
    () => buildCashFlow(transactions, statements, cards, recurring, monthCount),
    [transactions, statements, cards, recurring, monthCount],
  );

  const totalInflow  = points.reduce((s, p) => s + p.inflow,   0);
  const totalOutflow = points.reduce((s, p) => s + p.outflow,  0);
  const totalFaturas = points.reduce((s, p) => s + p.faturas,  0);
  const netPeriod    = totalInflow - totalOutflow - totalFaturas;

  const upcomingOut  = upcoming.filter((u) => u.amount < 0).reduce((s, u) => s + Math.abs(u.amount), 0);

  const granularityLabel = monthCount === 1 ? "diária" : monthCount === 3 ? "semanal" : "mensal";

  const PERIODS: { value: Period; label: string }[] = [
    { value: "1", label: "1 mês"   },
    { value: "3", label: "3 meses" },
    { value: "6", label: "6 meses" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fluxo de Caixa"
        subtitle="Movimentação real do dinheiro — PIX, débito automático e pagamentos de fatura."
        actions={
          <div className="flex items-center gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12.5px] transition",
                  period === p.value
                    ? "glass text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Regime de caixa callout */}
      <GlassCard className="p-4">
        <div className="flex gap-3">
          <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[12.5px] text-muted-foreground leading-relaxed">
            <span className="text-foreground font-medium">Regime de caixa:</span>{" "}
            Despesas no crédito <span className="font-medium text-foreground">não aparecem no dia do lançamento</span> —
            o caixa é impactado apenas no{" "}
            <span className="text-[oklch(0.72_0.16_50)] font-medium">vencimento da fatura</span>.
            PIX, débito automático e recorrências afetam o caixa imediatamente.
          </p>
        </div>
      </GlassCard>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Variação do caixa"
          value={brl(netPeriod)}
          accent={netPeriod >= 0 ? "positive" : "negative"}
          hint={`Últimos ${period} mes${period === "1" ? "" : "es"}`}
        />
        <Stat
          label="Entradas reais"
          value={brl(totalInflow)}
          accent="positive"
          hint="PIX, TED, transferência"
        />
        <Stat
          label="Saídas diretas"
          value={brl(totalOutflow)}
          accent="negative"
          hint="PIX, débito, manual"
        />
        <Stat
          label="Faturas pagas"
          value={brl(totalFaturas)}
          accent="warning"
          hint="Pagamentos de fatura no período"
        />
      </div>

      {/* Main chart: entradas/saídas com saldo acumulado */}
      <GlassCard>
        <SectionTitle
          title="Entradas e saídas do caixa"
          hint={`Granularidade ${granularityLabel} · saldo acumulado relativo ao início do período`}
          action={<Activity className="size-4 text-muted-foreground" />}
        />
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-4 text-[11.5px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "oklch(0.72 0.16 158)" }} />
            Entradas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "oklch(0.72 0.16 350)" }} />
            Saídas diretas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "oklch(0.72 0.16 50)" }} />
            Pagamento de fatura
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-0.5 h-3.5" style={{ background: "oklch(0.82 0.12 255)" }} />
            Saldo acumulado
          </span>
        </div>
        <div className="h-80 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={points} barGap={0}>
              <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="oklch(0.68 0.018 255)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="oklch(0.68 0.018 255)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                {...CHART_TOOLTIP}
                formatter={(v: number, name: string) => [brl(Math.abs(v)), name]}
              />
              <ReferenceLine y={0} stroke="oklch(1 0 0 / 20%)" strokeDasharray="4 4" />
              {/* Positive bars */}
              <Bar
                dataKey="inflow"
                name="Entradas"
                fill="oklch(0.72 0.16 158)"
                radius={[4, 4, 0, 0]}
                barSize={barSize}
              />
              {/* Negative bars stacked downward */}
              <Bar
                dataKey="outflowNeg"
                name="Saídas diretas"
                fill="oklch(0.72 0.16 350)"
                radius={[0, 0, 0, 0]}
                barSize={barSize}
                stackId="neg"
              />
              <Bar
                dataKey="faturasNeg"
                name="Pagamento de fatura"
                fill="oklch(0.72 0.16 50)"
                radius={[0, 0, 4, 4]}
                barSize={barSize}
                stackId="neg"
              />
              {/* Running balance line */}
              <Line
                type="monotone"
                dataKey="cumulative"
                name="Saldo acumulado"
                stroke="oklch(0.82 0.12 255)"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: "oklch(0.82 0.12 255)", strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Detail table + upcoming payments */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Period summary table */}
        <GlassCard>
          <SectionTitle
            title="Resumo do período"
            action={<Calendar className="size-4 text-muted-foreground" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="border-b border-glass-border text-muted-foreground text-[10.5px] uppercase tracking-wider">
                  <th className="text-left py-2 pr-3">Período</th>
                  <th className="text-right py-2 px-2">Entradas</th>
                  <th className="text-right py-2 px-2">Saídas</th>
                  <th className="text-right py-2 px-2">Faturas</th>
                  <th className="text-right py-2 pl-2">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {points.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-glass-border/50 hover:bg-accent/10 transition"
                  >
                    <td className="py-2 pr-3 font-medium">{row.label}</td>
                    <td className="py-2 px-2 tabular-nums text-right text-[var(--positive)]">
                      {row.inflow > 0 ? brl(row.inflow) : "—"}
                    </td>
                    <td className="py-2 px-2 tabular-nums text-right text-[var(--negative)]">
                      {row.outflow > 0 ? brl(row.outflow) : "—"}
                    </td>
                    <td className="py-2 px-2 tabular-nums text-right" style={{ color: "oklch(0.72 0.16 50)" }}>
                      {row.faturas > 0 ? brl(row.faturas) : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2 pl-2 tabular-nums text-right font-semibold",
                        row.net >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
                      )}
                    >
                      {brl(row.net)}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="text-[12px] font-semibold border-t-2 border-glass-border">
                  <td className="py-2.5 pr-3 text-muted-foreground">Total</td>
                  <td className="py-2.5 px-2 tabular-nums text-right text-[var(--positive)]">{brl(totalInflow)}</td>
                  <td className="py-2.5 px-2 tabular-nums text-right text-[var(--negative)]">{brl(totalOutflow)}</td>
                  <td className="py-2.5 px-2 tabular-nums text-right" style={{ color: "oklch(0.72 0.16 50)" }}>{brl(totalFaturas)}</td>
                  <td className={cn("py-2.5 pl-2 tabular-nums text-right", netPeriod >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]")}>
                    {brl(netPeriod)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </GlassCard>

        {/* Upcoming 60 days */}
        <GlassCard>
          <SectionTitle
            title="Próximos 60 dias"
            hint={
              upcoming.length > 0
                ? `${upcoming.filter((u) => u.amount < 0).length} saídas previstas · ${brl(upcomingOut)} a sair`
                : "Nenhum compromisso previsto"
            }
            action={<Repeat className="size-4 text-muted-foreground" />}
          />
          {upcoming.length === 0 ? (
            <p className="text-[13px] text-muted-foreground py-6 text-center">
              Nenhuma fatura ou recorrência nos próximos 60 dias.
            </p>
          ) : (
            <div className="space-y-0.5 max-h-80 overflow-y-auto pr-1">
              {upcoming.slice(0, 25).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 py-2.5 border-b border-glass-border/40 last:border-0"
                >
                  <div
                    className={cn(
                      "size-8 rounded-xl flex items-center justify-center shrink-0",
                      item.kind === "fatura"
                        ? "bg-[oklch(0.72_0.16_50_/_0.15)]"
                        : item.amount < 0
                          ? "bg-[oklch(0.72_0.16_350_/_0.12)]"
                          : "bg-[oklch(0.72_0.16_158_/_0.12)]",
                    )}
                  >
                    {item.kind === "fatura" ? (
                      <CreditCard className="size-4" style={{ color: "oklch(0.72 0.16 50)" }} />
                    ) : (
                      <Repeat
                        className={cn(
                          "size-4",
                          item.amount < 0 ? "text-[var(--negative)]" : "text-[var(--positive)]",
                        )}
                      />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(item.date + "T12:00:00").toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>

                  <span
                    className={cn(
                      "text-[13px] font-semibold tabular-nums shrink-0",
                      item.amount >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]",
                    )}
                  >
                    {item.amount >= 0 ? "+" : "−"}
                    {brl(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
              {upcoming.length > 25 && (
                <p className="text-[11.5px] text-muted-foreground text-center py-3">
                  +{upcoming.length - 25} compromissos adicionais
                </p>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
