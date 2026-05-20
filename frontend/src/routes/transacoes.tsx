import { createFileRoute } from "@tanstack/react-router";
import { Star, Filter, Download, MoreHorizontal, Search, Tag as TagIcon } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill } from "@/components/ui-bits";
import { categories, cards, transactions } from "@/lib/mock-data";
import { brl, dateBR } from "@/lib/format";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/transacoes")({
  head: () => ({ meta: [{ title: "Transações — Caderneta" }] }),
  component: Transacoes,
});

const filterChips = ["Este mês", "Cartões", "Manual", "Recorrente", "Pendentes", "Maiores valores"];

function Transacoes() {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const list = useMemo(() => {
    return transactions.filter((t) =>
      q ? (t.merchant + t.description).toLowerCase().includes(q.toLowerCase()) : true,
    );
  }, [q]);

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transações"
        subtitle={`${list.length} transações no período · ${brl(list.filter(t => t.amount < 0).reduce((s,t) => s + Math.abs(t.amount), 0))} em despesas`}
        actions={
          <>
            <button className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 transition flex items-center gap-1.5"><Download className="size-4" /> Exportar</button>
            <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5">+ Nova</button>
          </>
        }
      />

      {/* Search + chips */}
      <GlassCard className="p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por estabelecimento, descrição, tag…"
              className="w-full bg-transparent pl-9 pr-3 h-9 text-sm outline-none"
            />
          </div>
          <button className="h-9 px-3 rounded-xl glass-soft text-[12.5px] flex items-center gap-1.5">
            <Filter className="size-3.5" /> Filtros avançados
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {filterChips.map((c, i) => (
            <button
              key={c}
              className={`px-2.5 py-1 rounded-full text-[11.5px] transition ${i === 0 ? "bg-primary/20 text-primary border border-primary/30" : "glass-soft hover:bg-accent/40 text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </GlassCard>

      {selected.length > 0 && (
        <div className="glass rounded-2xl p-3 flex items-center gap-2 text-[13px]">
          <span className="font-medium">{selected.length} selecionadas</span>
          <div className="w-px h-5 bg-glass-border mx-1" />
          <button className="px-2.5 py-1 rounded-lg glass-soft hover:bg-accent/40 flex items-center gap-1.5"><TagIcon className="size-3.5" /> Categorizar em lote</button>
          <button className="px-2.5 py-1 rounded-lg glass-soft hover:bg-accent/40">Marcar revisadas</button>
          <button className="px-2.5 py-1 rounded-lg glass-soft hover:bg-accent/40 text-[var(--negative)]">Excluir</button>
          <button onClick={() => setSelected([])} className="ml-auto text-[12px] text-muted-foreground hover:text-foreground">Limpar</button>
        </div>
      )}

      {/* Table */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground sticky top-0 bg-card/70 backdrop-blur">
              <tr className="border-b border-glass-border">
                <th className="px-4 py-3 w-8"></th>
                <th className="text-left font-medium px-2 py-3">Data</th>
                <th className="text-left font-medium px-2 py-3">Estabelecimento</th>
                <th className="text-left font-medium px-2 py-3">Categoria</th>
                <th className="text-left font-medium px-2 py-3">Cartão</th>
                <th className="text-left font-medium px-2 py-3">Origem</th>
                <th className="text-left font-medium px-2 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Valor</th>
                <th className="px-2 py-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, 24).map((t) => {
                const cat = categories.find((c) => c.id === t.categoryId);
                const card = cards.find((c) => c.id === t.cardId);
                const isSel = selected.includes(t.id);
                return (
                  <tr key={t.id} className={`border-b border-glass-border/60 transition ${isSel ? "bg-primary/10" : "hover:bg-accent/20"}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={isSel} onChange={() => toggle(t.id)} className="size-3.5 accent-[oklch(0.72_0.16_255)]" />
                    </td>
                    <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">{dateBR(t.date)}</td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        {t.starred && <Star className="size-3 fill-[var(--warning)] text-[var(--warning)]" />}
                        <div>
                          <div className="font-medium">{t.merchant}</div>
                          <div className="text-[11px] text-muted-foreground">{t.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3">
                      <Pill tone="neutral">{cat?.icon} {cat?.name}</Pill>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground whitespace-nowrap">
                      {card ? `${card.name.split(" ")[1] ?? card.name} •••• ${card.last4}` : "—"}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground capitalize">{t.origin}</td>
                    <td className="px-2 py-3">
                      <Pill tone={t.status === "revisada" ? "positive" : "warning"}>{t.status}</Pill>
                    </td>
                    <td className={`px-4 py-3 text-right num font-medium ${t.amount > 0 ? "text-[var(--positive)]" : ""}`}>
                      {t.amount > 0 ? "+" : "−"}{brl(Math.abs(t.amount))}
                    </td>
                    <td className="px-2 py-3"><MoreHorizontal className="size-4 text-muted-foreground" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
