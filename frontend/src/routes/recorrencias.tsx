import { createFileRoute } from "@tanstack/react-router";
import { Plus, Calendar } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { categories, recurrences } from "@/lib/mock-data";
import { brl, dateBR } from "@/lib/format";

export const Route = createFileRoute("/recorrencias")({
  head: () => ({ meta: [{ title: "Recorrências — Caderneta" }] }),
  component: Recorrencias,
});

function Recorrencias() {
  const desp = recurrences.filter((r) => r.type === "despesa");
  const rec = recurrences.filter((r) => r.type === "receita");
  const totalDesp = desp.filter(r => r.enabled).reduce((s, r) => s + r.amount, 0);
  const totalRec = rec.filter(r => r.enabled).reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recorrências"
        subtitle="Assinaturas, contas fixas e receitas previstas para os próximos meses."
        actions={
          <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"><Plus className="size-4" /> Nova recorrência</button>
        }
      />

      <div className="grid md:grid-cols-3 gap-4">
        <GlassCard><div className="text-[12px] uppercase tracking-wider text-muted-foreground">Despesas recorrentes</div><div className="num text-2xl font-semibold mt-1">{brl(totalDesp)}</div><div className="text-[11px] text-muted-foreground mt-0.5">por mês</div></GlassCard>
        <GlassCard><div className="text-[12px] uppercase tracking-wider text-muted-foreground">Receitas recorrentes</div><div className="num text-2xl font-semibold mt-1 text-[var(--positive)]">{brl(totalRec)}</div><div className="text-[11px] text-muted-foreground mt-0.5">por mês</div></GlassCard>
        <GlassCard><div className="text-[12px] uppercase tracking-wider text-muted-foreground">Saldo recorrente</div><div className="num text-2xl font-semibold mt-1">{brl(totalRec - totalDesp)}</div><div className="text-[11px] text-muted-foreground mt-0.5">previsto</div></GlassCard>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-5 pb-3 flex items-center justify-between">
          <SectionTitle title="Próximas ocorrências" hint="Ordenado por data" />
          <button className="text-[12px] glass-soft px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Calendar className="size-3.5" /> Calendário</button>
        </div>
        <div className="divide-y divide-glass-border">
          {recurrences.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            return (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition">
                <div className="size-10 rounded-xl glass-soft grid place-items-center text-lg">{cat?.icon ?? "🔁"}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium">{r.name}</div>
                  <div className="text-[11.5px] text-muted-foreground flex items-center gap-2">
                    <span>{cat?.name}</span>
                    <span>·</span>
                    <span>{r.periodicity}</span>
                    <span>·</span>
                    <span>Próx. {dateBR(r.next)}</span>
                  </div>
                </div>
                <Pill tone={r.type === "receita" ? "positive" : "neutral"}>{r.type}</Pill>
                <div className={`num text-[14px] font-semibold w-28 text-right ${r.type === "receita" ? "text-[var(--positive)]" : ""}`}>
                  {r.type === "receita" ? "+" : "−"}{brl(r.amount)}
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked={r.enabled} className="sr-only peer" />
                  <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                </label>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
