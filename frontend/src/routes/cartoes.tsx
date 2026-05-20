import { createFileRoute } from "@tanstack/react-router";
import { Plus, CreditCard as CardIcon, Wifi, ArrowUpRight } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/cartoes")({
  head: () => ({ meta: [{ title: "Cartões — Caderneta" }] }),
  component: Cartoes,
});

function Cartoes() {
  const { cards } = useAppData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartões"
        subtitle="Gerencie limites, faturas em aberto e tendências de uso."
        actions={
          <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5">
            <Plus className="size-4" /> Adicionar cartão
          </button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {cards.map((c) => {
          const usage = c.used / c.limit;
          const high = usage > 0.7;
          return (
            <div key={c.id} className="space-y-3">
              {/* Card visual */}
              <div
                className="rounded-3xl aspect-[1.586/1] p-5 relative overflow-hidden shadow-[0_20px_60px_-25px_rgba(0,0,0,.6)] flex flex-col justify-between"
                style={{ background: c.gradient }}
              >
                <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
                <div className="flex items-start justify-between text-white">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider opacity-70">{c.bank}</div>
                    <div className="text-[15px] font-semibold mt-0.5">{c.name}</div>
                  </div>
                  <Wifi className="size-5 opacity-70 rotate-90" />
                </div>
                <div className="text-white">
                  <div className="text-[12px] tracking-[0.4em] num mb-2 opacity-80">
                    •••• •••• •••• {c.last4}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider opacity-60">Fatura aberta</div>
                      <div className="num text-lg font-semibold">{brl(c.used)}</div>
                    </div>
                    <div className="text-[11px] font-medium opacity-80">{c.brand}</div>
                  </div>
                </div>
                {c.primary && (
                  <div className="absolute top-4 right-12">
                    <Pill tone="warning">Principal</Pill>
                  </div>
                )}
              </div>

              {/* Card details */}
              <GlassCard>
                <div className="flex items-center justify-between mb-3">
                  <SectionTitle title="Limite" />
                  {high && <Pill tone="negative">Atenção</Pill>}
                </div>
                <div className="flex items-end justify-between mb-2">
                  <div className="num font-semibold text-lg">{brl(c.used)}</div>
                  <div className="text-[12px] text-muted-foreground num">de {brl(c.limit)}</div>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${high ? "bg-gradient-to-r from-[var(--warning)] to-[var(--negative)]" : "bg-gradient-to-r from-primary to-chart-3"}`}
                    style={{ width: `${Math.min(usage * 100, 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Item label="Disponível" value={brl(c.limit - c.used)} accent="positive" />
                  <Item label="Uso" value={`${Math.round(usage * 100)}%`} />
                  <Item label="Fechamento" value={`Dia ${c.closingDay}`} />
                  <Item label="Vencimento" value={`Dia ${c.dueDay}`} />
                </div>
                <button className="w-full mt-4 h-9 rounded-xl glass-soft hover:bg-accent/40 transition text-[13px] font-medium flex items-center justify-center gap-1.5">
                  Ver faturas <ArrowUpRight className="size-3.5" />
                </button>
              </GlassCard>
            </div>
          );
        })}
      </div>

      {/* Empty placeholder card add */}
      <div className="glass rounded-3xl border-dashed border-2 border-glass-border/70 hover:border-primary/40 transition cursor-pointer p-6 flex items-center justify-center gap-3 text-muted-foreground hover:text-foreground">
        <CardIcon className="size-5" />
        <span className="text-[14px] font-medium">Adicionar outro cartão</span>
      </div>
    </div>
  );
}

function Item({ label, value, accent }: { label: string; value: string; accent?: "positive" }) {
  return (
    <div className="glass-soft rounded-xl p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-[14px] font-semibold num mt-0.5 ${accent === "positive" ? "text-[var(--positive)]" : ""}`}>{value}</div>
    </div>
  );
}
