import { createFileRoute } from "@tanstack/react-router";
import { Plus, Check } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { goals } from "@/lib/mock-data";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas — Caderneta" }] }),
  component: Metas,
});

function Metas() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        subtitle="Acompanhe suas reservas, viagens e objetivos financeiros."
        actions={
          <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"><Plus className="size-4" /> Nova meta</button>
        }
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((g) => {
          const p = g.current / g.target;
          const remaining = g.target - g.current;
          const monthsLeft = Math.max(1, Math.ceil((+new Date(g.deadline) - Date.now()) / (1000 * 60 * 60 * 24 * 30)));
          const monthly = remaining / monthsLeft;
          const done = p >= 1;
          return (
            <GlassCard key={g.id} className="relative overflow-hidden">
              <div className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/10 blur-2xl" />
              <div className="flex items-start justify-between mb-4">
                <div className="size-12 rounded-2xl glass-soft grid place-items-center text-2xl">{g.icon}</div>
                {done ? (
                  <Pill tone="positive"><Check className="size-3" /> Concluída</Pill>
                ) : monthsLeft < 3 ? (
                  <Pill tone="warning">Prazo curto</Pill>
                ) : (
                  <Pill tone="info">Ativa</Pill>
                )}
              </div>
              <div className="text-[15px] font-semibold">{g.name}</div>
              <div className="text-[11.5px] text-muted-foreground mt-0.5">Prazo: {dateBR(g.deadline)}</div>

              <div className="mt-4">
                <div className="flex items-end justify-between mb-1.5">
                  <div className="num text-2xl font-semibold">{brl(g.current)}</div>
                  <div className="text-[11px] text-muted-foreground num">de {brl(g.target)}</div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary via-chart-3 to-chart-2" style={{ width: `${Math.min(p * 100, 100)}%` }} />
                </div>
                <div className="text-[11.5px] text-muted-foreground mt-1.5">{Math.round(p * 100)}% concluído</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="glass-soft rounded-xl p-3">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Restante</div>
                  <div className="num text-[13.5px] font-semibold mt-0.5">{brl(remaining)}</div>
                </div>
                <div className="glass-soft rounded-xl p-3">
                  <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Aporte ideal</div>
                  <div className="num text-[13.5px] font-semibold mt-0.5">{brl(monthly)}/mês</div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
