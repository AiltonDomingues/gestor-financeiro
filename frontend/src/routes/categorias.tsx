import { createFileRoute } from "@tanstack/react-router";
import { Plus, GripVertical, MoreHorizontal, Wand2 } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { categorySpend } from "@/lib/mock-data";
import { brl, pct } from "@/lib/format";

export const Route = createFileRoute("/categorias")({
  head: () => ({ meta: [{ title: "Categorias — Caderneta" }] }),
  component: Categorias,
});

const rules = [
  { id: 1, when: "Descrição contém “IFOOD”", then: "Alimentação", priority: 1, enabled: true },
  { id: 2, when: "Estabelecimento contém “UBER”", then: "Transporte", priority: 2, enabled: true },
  { id: 3, when: "Valor entre R$ 30 e R$ 60 + cartão Unique", then: "Streaming", priority: 3, enabled: false },
  { id: 4, when: "Descrição contém “DROGA”", then: "Farmácia", priority: 4, enabled: true },
];

function Categorias() {
  const total = categorySpend.reduce((s, c) => s + c.spent, 0);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorias"
        subtitle="Organize seus gastos e crie regras automáticas de categorização."
        actions={
          <>
            <button className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5"><Wand2 className="size-4" /> Nova regra</button>
            <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"><Plus className="size-4" /> Nova categoria</button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle title="Categorias e gastos" hint={`${categorySpend.length} categorias · total ${brl(total)}`} />
          </div>
          <div className="divide-y divide-glass-border">
            {categorySpend.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition">
                <GripVertical className="size-4 text-muted-foreground/50" />
                <div className="size-10 rounded-xl grid place-items-center text-lg" style={{ background: `${c.color}22` }}>{c.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium">{c.name}</div>
                  <div className="text-[11.5px] text-muted-foreground">{c.count} transações · {pct(c.spent / total, 1)} do total</div>
                </div>
                <div className="w-40 hidden md:block">
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.min((c.spent / categorySpend[0].spent) * 100, 100)}%`, background: c.color }} />
                  </div>
                </div>
                <div className="num text-[14px] font-semibold w-28 text-right">{brl(c.spent)}</div>
                {c.budget && (
                  <Pill tone={c.spent > c.budget ? "negative" : c.spent > c.budget * 0.8 ? "warning" : "positive"}>
                    {Math.round((c.spent / c.budget) * 100)}% do orçamento
                  </Pill>
                )}
                <MoreHorizontal className="size-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Regras automáticas" hint="Aplicadas em novas transações" />
          <div className="space-y-2.5">
            {rules.map((r) => (
              <div key={r.id} className="glass-soft rounded-xl p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <Pill tone="info">Prioridade {r.priority}</Pill>
                  <div className={`size-2 rounded-full ${r.enabled ? "bg-[var(--positive)]" : "bg-muted-foreground/40"}`} />
                </div>
                <div className="text-[12.5px]">
                  <span className="text-muted-foreground">Se</span> <span className="font-medium">{r.when}</span>
                </div>
                <div className="text-[12.5px] mt-0.5">
                  <span className="text-muted-foreground">Então</span> <Pill tone="neutral">{r.then}</Pill>
                </div>
              </div>
            ))}
            <button className="w-full glass-soft rounded-xl py-2.5 text-[12.5px] font-medium hover:bg-accent/40 flex items-center justify-center gap-1.5">
              <Plus className="size-3.5" /> Adicionar regra
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
