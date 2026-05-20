import { createFileRoute } from "@tanstack/react-router";
import { FileText, AlertCircle, CheckCircle2, Clock, Copy, RefreshCw, Trash2, Upload, ChevronDown } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl, dateBR } from "@/lib/format";
import { useState } from "react";

export const Route = createFileRoute("/faturas")({
  head: () => ({ meta: [{ title: "Faturas — Caderneta" }] }),
  component: Faturas,
});

const statusTone: Record<string, "neutral" | "positive" | "negative" | "warning" | "info"> = {
  importada: "positive",
  pendente: "warning",
  erro: "negative",
  duplicada: "info",
};

function Faturas() {
  const { cards, statements, transactions, categories } = useAppData();
  const [selected, setSelected] = useState(() => statements[0]?.id ?? "");
  const current = statements.find((s) => s.id === selected);
  const card = current ? cards.find((c) => c.id === current.cardId) : undefined;
  const items = transactions.slice(0, 12);

  if (!current || !card) {
    return (
      <div className="space-y-6">
        <PageHeader title="Faturas" subtitle="Importe, revise e gerencie suas faturas Santander e demais cartões." />
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
          Nenhuma fatura disponível ainda. Importe um PDF para começar.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturas"
        subtitle="Importe, revise e gerencie suas faturas Santander e demais cartões."
        actions={
          <>
            <button className="h-9 px-3 rounded-xl text-[13px] font-medium glass hover:bg-accent/40 transition flex items-center gap-1.5">
              <RefreshCw className="size-4" /> Reprocessar
            </button>
            <button className="h-9 px-3 rounded-xl text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1.5">
              <Upload className="size-4" /> Importar PDF
            </button>
          </>
        }
      />

      {/* Upload dropzone */}
      <div className="glass rounded-2xl p-6 border-dashed border-2 border-glass-border/80 hover:border-primary/40 transition group cursor-pointer">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="size-12 rounded-2xl bg-primary/15 grid place-items-center group-hover:bg-primary/25 transition">
            <Upload className="size-5 text-primary" />
          </div>
          <div className="text-[14px] font-medium">Arraste sua fatura Santander aqui</div>
          <div className="text-[12px] text-muted-foreground">
            PDFs até 20 MB. Vamos extrair e categorizar automaticamente.
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Statements list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Histórico de faturas</h2>
            <button className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground">
              Todos os cartões <ChevronDown className="size-3" />
            </button>
          </div>
          {statements.map((s) => {
            const c = cards.find((x) => x.id === s.cardId)!;
            const active = s.id === selected;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`w-full text-left glass rounded-2xl p-4 transition ${active ? "ring-1 ring-primary/60" : "hover:bg-accent/30"}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <span className="text-[13px] font-medium">{s.reference}</span>
                  </div>
                  <Pill tone={statusTone[s.status]}>{s.status}</Pill>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2">{c.name} •••• {c.last4}</div>
                <div className="flex items-end justify-between">
                  <div className="num text-lg font-semibold">{brl(s.total)}</div>
                  <div className="text-[11px] text-muted-foreground">{s.itemsCount} compras</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Statement detail */}
        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{card.bank}</div>
                <h3 className="text-xl font-semibold mt-0.5">{card.name} — {current.reference}</h3>
                <div className="text-[12px] text-muted-foreground mt-1 flex items-center gap-3">
                  <span>Fechamento {dateBR(current.closingDate)}</span>
                  <span>·</span>
                  <span>Vencimento {dateBR(current.dueDate)}</span>
                </div>
              </div>
              <Pill tone={statusTone[current.status]}>
                {current.status === "importada" ? <CheckCircle2 className="size-3" /> : current.status === "pendente" ? <Clock className="size-3" /> : <AlertCircle className="size-3" />}
                {current.status}
              </Pill>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              <Mini label="Total" value={brl(current.total)} />
              <Mini label="Mínimo" value={brl(current.minimum)} />
              <Mini label="Limite usado" value={brl(card.used)} hint={`de ${brl(card.limit)}`} />
              <Mini label="Disponível" value={brl(card.limit - card.used)} positive />
            </div>

            <div className="mt-5 flex items-center gap-2">
              <button className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5"><CheckCircle2 className="size-3.5" /> Confirmar revisão</button>
              <button className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5"><Copy className="size-3.5" /> Duplicar como manual</button>
              <button className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 text-[var(--negative)]"><Trash2 className="size-3.5" /> Excluir</button>
            </div>
          </GlassCard>

          <GlassCard className="p-0 overflow-hidden">
            <div className="p-5 pb-3">
              <SectionTitle title="Compras extraídas" hint={`${items.length} itens · confiança média 96%`} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr className="border-y border-glass-border">
                    <th className="text-left font-medium px-5 py-2.5">Data</th>
                    <th className="text-left font-medium px-2 py-2.5">Estabelecimento</th>
                    <th className="text-left font-medium px-2 py-2.5">Categoria</th>
                    <th className="text-left font-medium px-2 py-2.5">Parcela</th>
                    <th className="text-right font-medium px-5 py-2.5">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((t) => {
                    const cat = categories.find((c) => c.id === t.categoryId);
                    return (
                      <tr key={t.id} className="border-b border-glass-border/60 hover:bg-accent/20 transition">
                        <td className="px-5 py-3 text-muted-foreground">{dateBR(t.date)}</td>
                        <td className="px-2 py-3 font-medium">{t.merchant}</td>
                        <td className="px-2 py-3">
                          <Pill tone="neutral">{cat?.icon} {cat?.name}</Pill>
                        </td>
                        <td className="px-2 py-3 text-muted-foreground num">
                          {t.installment ? `${String(t.installment.current).padStart(2, "0")}/${String(t.installment.total).padStart(2, "0")}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-right num font-medium">{brl(Math.abs(t.amount))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, hint, positive }: { label: string; value: string; hint?: string; positive?: boolean }) {
  return (
    <div className="glass-soft rounded-xl p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-[16px] font-semibold num mt-0.5 ${positive ? "text-[var(--positive)]" : ""}`}>{value}</div>
      {hint && <div className="text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
