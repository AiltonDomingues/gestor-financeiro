import { createFileRoute } from "@tanstack/react-router";
import { TrendingDown, TrendingUp, Sparkles, AlertTriangle, Clock, Repeat, BarChart3 } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categorySpend, monthlyTrend, topMerchants } from "@/lib/mock-data";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/insights")({
  head: () => ({ meta: [{ title: "Insights — Caderneta" }] }),
  component: Insights,
});

const insights = [
  { tone: "warning" as const, icon: TrendingUp, title: "Alimentação subiu 18%", text: "Seus gastos com alimentação subiram 18% comparado a abril." },
  { tone: "info" as const, icon: Sparkles, title: "Padrão de sexta", text: "Você gastou mais com transporte nas sextas-feiras este mês." },
  { tone: "negative" as const, icon: AlertTriangle, title: "Limite em 84%", text: "Seu cartão Santander Unique já consumiu 84% do limite atual." },
  { tone: "neutral" as const, icon: Repeat, title: "Assinaturas em alta", text: "Assinaturas representam 12% dos seus gastos recorrentes." },
  { tone: "positive" as const, icon: TrendingDown, title: "Lazer caiu 22%", text: "Seus gastos com lazer reduziram 22% em relação ao mês anterior." },
  { tone: "info" as const, icon: Clock, title: "Pico às terças", text: "Seu maior volume de gastos ocorre nas terças-feiras à noite." },
];

function Insights() {
  return (
    <div className="space-y-6">
      <PageHeader title="Insights" subtitle="Padrões, alertas e descobertas automáticas do seu mês." />

      {/* Editorial cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((i, idx) => {
          const Icon = i.icon;
          return (
            <GlassCard key={idx} className="relative overflow-hidden">
              <div className={`absolute -top-12 -right-12 size-32 rounded-full blur-2xl bg-[var(--${i.tone === "warning" ? "warning" : i.tone === "info" ? "info" : i.tone === "negative" ? "negative" : i.tone === "positive" ? "positive" : "primary"})]/20`} />
              <div className="size-10 rounded-2xl glass-soft grid place-items-center mb-3">
                <Icon className={`size-4 text-[var(--${i.tone === "warning" ? "warning" : i.tone === "info" ? "info" : i.tone === "negative" ? "negative" : i.tone === "positive" ? "positive" : "primary"})]`} />
              </div>
              <div className="text-[14px] font-semibold mb-1">{i.title}</div>
              <p className="text-[12.5px] text-muted-foreground leading-relaxed">{i.text}</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title="Evolução por categoria" hint="Comparativo dos últimos 6 meses" />
          <div className="h-64 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => brl(v)} />
                <Bar dataKey="despesas" fill="oklch(0.72 0.16 255)" radius={[6, 6, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Concentração" hint="Onde está seu dinheiro" />
          <div className="space-y-2">
            {topMerchants.slice(0, 6).map((m, i) => (
              <div key={m.name} className="flex items-center gap-2 text-[13px]">
                <span className="w-5 text-muted-foreground tabular-nums text-[11px]">{i + 1}.</span>
                <span className="flex-1 truncate">{m.name}</span>
                <span className="num text-muted-foreground">{brl(m.total)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
