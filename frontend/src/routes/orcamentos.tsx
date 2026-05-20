import { createFileRoute } from "@tanstack/react-router";
import { Plus, Copy } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, Stat } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import {
  computeCategorySpend,
  filterCurrentMonth,
} from "@/lib/selectors";
import { brl } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos — Caderneta" }] }),
  component: Orcamentos,
});

function Orcamentos() {
  const { transactions, categories } = useAppData();
  const currentMonth = useMemo(() => filterCurrentMonth(transactions), [transactions]);
  const categorySpend = useMemo(
    () => computeCategorySpend(currentMonth, categories),
    [currentMonth, categories],
  );
  const cats = categorySpend.filter((c) => c.budget);
  const totalBudget = cats.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const pct = (totalSpent / totalBudget) * 100;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Defina limites por categoria e acompanhe o consumo do mês."
        actions={
          <>
            <button className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5"><Copy className="size-4" /> Copiar do mês anterior</button>
            <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"><Plus className="size-4" /> Novo orçamento</button>
          </>
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Orçamento mensal" value={brl(totalBudget)} hint="Total planejado" />
        <Stat label="Consumido" value={brl(totalSpent)} delta={`${pct.toFixed(0)}%`} accent={pct > 90 ? "negative" : pct > 70 ? "warning" : "default"} />
        <Stat label="Restante" value={brl(Math.max(totalBudget - totalSpent, 0))} accent="positive" hint="Disponível até o fim do mês" />
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-5 pb-3">
          <SectionTitle title="Por categoria" hint="Limites e consumo atual" />
        </div>
        <div className="divide-y divide-glass-border">
          {cats.map((c) => {
            const p = (c.spent / (c.budget ?? 1)) * 100;
            const tone = p > 100 ? "negative" : p > 80 ? "warning" : p > 60 ? "info" : "positive";
            return (
              <div key={c.id} className="px-5 py-4 hover:bg-accent/20 transition">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl grid place-items-center" style={{ background: `${c.color}22` }}>{c.icon}</div>
                    <div>
                      <div className="text-[14px] font-medium">{c.name}</div>
                      <div className="text-[11.5px] text-muted-foreground">{c.count} transações</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="num text-[14px] font-semibold">{brl(c.spent)} <span className="text-muted-foreground text-[11px] font-normal">/ {brl(c.budget!)}</span></div>
                      <div className="text-[11px] text-muted-foreground">{p > 100 ? `Excedido em ${brl(c.spent - c.budget!)}` : `Restam ${brl(c.budget! - c.spent)}`}</div>
                    </div>
                    <Pill tone={tone}>{Math.round(p)}%</Pill>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(p, 100)}%`,
                      background:
                        p > 100
                          ? "linear-gradient(90deg, var(--warning), var(--negative))"
                          : p > 80
                          ? "linear-gradient(90deg, var(--info), var(--warning))"
                          : "linear-gradient(90deg, var(--positive), var(--info))",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
