import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import {
  computeTotals,
  computeCategorySpend,
  computeMonthlyTrend,
  computeTopMerchants,
  filterCurrentMonth,
} from "@/lib/selectors";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Caderneta" },
      { name: "description", content: "Visão executiva das suas finanças do mês." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { transactions, categories, goals, recurring } = useAppData();
  const currentMonth = useMemo(() => filterCurrentMonth(transactions), [transactions]);
  const totals = useMemo(() => computeTotals(currentMonth), [currentMonth]);
  const categorySpend = useMemo(
    () => computeCategorySpend(currentMonth, categories),
    [currentMonth, categories],
  );
  const monthlyTrend = useMemo(() => computeMonthlyTrend(transactions), [transactions]);
  const topMerchants = useMemo(() => computeTopMerchants(currentMonth), [currentMonth]);

  const net = totals.income - totals.expenses;
  const recent = currentMonth.slice(0, 6);
  const topCats = categorySpend.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boa noite, Ailton"
        subtitle="Aqui está o resumo do seu mês de Maio de 2026."
        actions={
          <button className="h-9 px-3 rounded-xl text-[13px] font-medium glass hover:bg-accent/40 transition">
            Exportar resumo
          </button>
        }
      />

      {/* Hero */}
      <div className="glass rounded-3xl p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-20 size-72 rounded-full bg-chart-3/20 blur-3xl pointer-events-none" />
        <div className="relative grid lg:grid-cols-3 gap-6">
          <div>
            <div className="text-[12px] uppercase tracking-wider text-muted-foreground">Saldo do período</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl lg:text-5xl font-semibold num tracking-tight">
                {brl(net)}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Pill tone={net >= 0 ? "positive" : "negative"}>
                {net >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                {net >= 0 ? "Positivo" : "Negativo"}
              </Pill>
              <span className="text-muted-foreground">vs mês anterior</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <MiniMetric label="Recebido" value={brl(totals.income)} accent="positive" delta="+3,2%" />
            <MiniMetric label="Gasto total" value={brl(totals.expenses)} accent="negative" delta="+12,4%" />
            <MiniMetric label="Cartões" value={brl(totals.cardSpend)} hint="3 cartões ativos" />
            <MiniMetric label="Manual" value={brl(totals.manualSpend)} hint="Dinheiro/Pix" />
          </div>
        </div>
      </div>

      {/* Trend + Insights */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionTitle
            title="Tendência mensal"
            hint="Receitas vs despesas nos últimos 6 meses"
            action={
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="size-2 rounded-full bg-[var(--positive)]" /> Receitas
                <span className="size-2 rounded-full bg-primary ml-2" /> Despesas
              </div>
            }
          />
          <div className="h-64 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend}>
                <defs>
                  <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.16 158)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.16 158)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.16 255)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.16 255)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => brl(v)}
                  labelStyle={{ color: "oklch(0.96 0.005 250)" }}
                />
                <Area type="monotone" dataKey="receitas" stroke="oklch(0.72 0.16 158)" strokeWidth={2} fill="url(#r)" />
                <Area type="monotone" dataKey="despesas" stroke="oklch(0.72 0.16 255)" strokeWidth={2} fill="url(#d)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Insights" hint="Padrões detectados no período" />
          <div className="space-y-3">
            {[
              { icon: TrendingUp, tone: "warning" as const, text: "Seus gastos com alimentação subiram 18% neste mês." },
              { icon: Sparkles, tone: "info" as const, text: "Você gastou mais com transporte às sextas-feiras." },
              { icon: AlertTriangle, tone: "negative" as const, text: "Cartão Santander Unique já usou 84% do limite." },
              { icon: CheckCircle2, tone: "positive" as const, text: "Meta MacBook Pro está em 79% — falta R$ 3.800." },
            ].map((i, idx) => {
              const Icon = i.icon;
              return (
                <div key={idx} className="glass-soft rounded-xl p-3 flex items-start gap-3">
                  <div className={`size-8 rounded-lg grid place-items-center bg-[var(--${i.tone === "warning" ? "warning" : i.tone === "info" ? "info" : i.tone === "negative" ? "negative" : "positive"})]/15 text-[var(--${i.tone === "warning" ? "warning" : i.tone === "info" ? "info" : i.tone === "negative" ? "negative" : "positive"})] shrink-0`}>
                    <Icon className="size-4" />
                  </div>
                  <p className="text-[13px] leading-relaxed">{i.text}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Categories + recent + goals row */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard>
          <SectionTitle title="Top categorias" hint="Maiores gastos do mês" />
          <div className="space-y-3">
            {topCats.map((c) => {
              const max = topCats[0].spent;
              return (
                <div key={c.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2">
                      <span>{c.icon}</span> {c.name}
                    </span>
                    <span className="num text-muted-foreground">{brl(c.spent)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(c.spent / max) * 100}%`,
                        background: `linear-gradient(90deg, ${c.color}, oklch(0.72 0.16 255))`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle
            title="Distribuição por categoria"
            hint="Participação no mês"
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topCats}
                  dataKey="spent"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={2}
                  stroke="none"
                >
                  {topCats.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }}
                  formatter={(v: number) => brl(v)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-2 text-[11px]">
            {topCats.map((c) => (
              <div key={c.id} className="flex items-center gap-1.5 text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: c.color }} />
                {c.name}
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Metas ativas" hint="Progresso atual" action={<Link to="/metas" className="text-[12px] text-primary">Ver todas</Link>} />
          <div className="space-y-3">
            {goals.slice(0, 3).map((g) => {
              const p = g.current / g.target;
              return (
                <div key={g.id} className="glass-soft rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium flex items-center gap-2">
                      <span>{g.icon}</span> {g.name}
                    </span>
                    <span className="text-[11px] text-muted-foreground num">
                      {brl(g.current)} / {brl(g.target)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-chart-2"
                      style={{ width: `${p * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Recent + Upcoming */}
      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionTitle
            title="Atividade recente"
            hint="Últimas transações revisadas"
            action={<Link to="/transacoes" className="text-[12px] text-primary">Ver todas</Link>}
          />
          <div className="divide-y divide-glass-border">
            {recent.map((t) => {
              const cat = categories.find((c) => c.id === t.categoryId);
              return (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <div className="size-9 rounded-xl glass-soft grid place-items-center text-base">
                    {cat?.icon ?? "•"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium truncate">{t.merchant}</div>
                    <div className="text-[11.5px] text-muted-foreground flex items-center gap-2">
                      <span>{dateBR(t.date)}</span>
                      <span>·</span>
                      <span>{cat?.name}</span>
                      {t.installment && (
                        <>
                          <span>·</span>
                          <span>{String(t.installment.current).padStart(2, "0")}/{String(t.installment.total).padStart(2, "0")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`num text-[13.5px] font-medium ${t.amount < 0 ? "text-foreground" : "text-[var(--positive)]"}`}>
                    {t.amount < 0 ? "−" : "+"}{brl(Math.abs(t.amount))}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Próximas recorrências" hint="A vencer em breve" />
          <div className="space-y-2.5">
            {recurring.filter((r) => r.enabled).slice(0, 5).map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <div key={r.id} className="flex items-center gap-3 py-1">
                  <div className="size-9 rounded-xl glass-soft grid place-items-center text-base">{cat?.icon ?? "🔁"}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{dateBR(r.next)} · {r.periodicity}</div>
                  </div>
                  <div className={`num text-[13px] font-medium ${r.type === "receita" ? "text-[var(--positive)]" : ""}`}>
                    {r.type === "receita" ? "+" : "−"}{brl(r.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Top merchants */}
      <GlassCard>
        <SectionTitle title="Lojas mais frequentes" hint="Onde você mais gastou no período" />
        <div className="h-56 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topMerchants} layout="vertical" margin={{ left: 12 }}>
              <CartesianGrid stroke="oklch(1 0 0 / 5%)" horizontal={false} />
              <XAxis type="number" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
              <YAxis type="category" dataKey="name" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} width={110} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => brl(v)} />
              <Bar dataKey="total" fill="oklch(0.72 0.16 255)" radius={[0, 6, 6, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}

function MiniMetric({ label, value, hint, delta, accent }: { label: string; value: string; hint?: string; delta?: string; accent?: "positive" | "negative" }) {
  return (
    <div className="glass-soft rounded-2xl p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-semibold num mt-1 ${accent === "positive" ? "text-[var(--positive)]" : accent === "negative" ? "text-foreground" : ""}`}>{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
        {delta && (
          <span className={`${delta.startsWith("+") && accent === "negative" ? "text-[var(--negative)]" : "text-[var(--positive)]"}`}>{delta}</span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}
