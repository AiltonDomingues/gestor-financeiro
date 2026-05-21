import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, AlertCircle, CheckCircle2, Clock, Copy,
  RefreshCw, Trash2, ChevronDown, X, Banknote,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl, dateBR } from "@/lib/format";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/faturas")({
  head: () => ({ meta: [{ title: "Faturas — Caderneta" }] }),
  component: Faturas,
});

const statusTone: Record<string, "neutral" | "positive" | "negative" | "warning" | "info"> = {
  importada: "info",
  pendente: "warning",
  erro: "negative",
  duplicada: "neutral",
  paga: "positive",
};

type DialogMode = "delete" | null;

function Faturas() {
  const {
    cards, statements, transactions, categories,
    updateStatement, deleteStatement,
    updateTransaction, addTransaction, deleteTransaction,
  } = useAppData();

  const [selected, setSelected] = useState("");
  const [filterCard, setFilterCard] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [saving, setSaving] = useState(false);

  // Sync selected when statements load
  useEffect(() => {
    if (!selected && statements.length > 0) setSelected(statements[0].id);
  }, [statements, selected]);

  const filteredStatements = useMemo(() => {
    if (!filterCard) return statements;
    return statements.filter((s) => s.cardId === filterCard);
  }, [statements, filterCard]);

  const current = statements.find((s) => s.id === selected);
  const card = current ? cards.find((c) => c.id === current.cardId) : undefined;

  // Transactions linked to this statement
  const items = useMemo(
    () => transactions.filter((t) => t.statementId === selected),
    [transactions, selected],
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleConfirmReview() {
    if (!current) return;
    setSaving(true);
    try {
      await updateStatement(current.id, { status: "importada" });
      for (const t of items) await updateTransaction(t.id, { status: "revisada" });
    } finally { setSaving(false); }
  }

  async function handleMarkPaid() {
    if (!current) return;
    setSaving(true);
    try {
      await updateStatement(current.id, { status: current.status === "paga" ? "importada" : "paga" });
    } finally { setSaving(false); }
  }

  async function handleReprocess() {
    if (!current) return;
    setSaving(true);
    try {
      await updateStatement(current.id, { status: "pendente" });
      for (const t of items) await updateTransaction(t.id, { status: "pendente" });
    } finally { setSaving(false); }
  }

  async function handleDuplicate() {
    if (!current) return;
    setSaving(true);
    try {
      for (const t of items) {
        await addTransaction({
          date: t.date,
          merchant: t.merchant,
          description: t.description,
          amount: t.amount,
          categoryId: t.categoryId,
          cardId: t.cardId,
          origin: "manual",
          status: "pendente",
          installment: t.installment,
          note: t.note,
        });
      }
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!current) return;
    setSaving(true);
    try {
      for (const t of items) await deleteTransaction(t.id);
      await deleteStatement(current.id);
      setSelected(statements.find((s) => s.id !== current.id)?.id ?? "");
      setDialog(null);
    } finally { setSaving(false); }
  }

  // ── Empty state ───────────────────────────────────────────────────────────

  if (statements.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Faturas"
          subtitle="Revise e gerencie suas faturas."
        />
        <div className="glass rounded-2xl p-10">
          <p className="text-center text-[13px] text-muted-foreground">
            Nenhuma fatura importada. Use a seção <strong className="text-foreground/70">Importações</strong> para adicionar faturas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Faturas"
        subtitle={`${statements.length} fatura${statements.length !== 1 ? "s" : ""} importada${statements.length !== 1 ? "s" : ""}`}
        actions={
          current ? (
            <button
              onClick={handleReprocess}
              disabled={saving}
              className="h-9 px-3 rounded-xl text-[13px] font-medium glass hover:bg-accent/40 transition flex items-center gap-1.5 disabled:opacity-40"
            >
              <RefreshCw className="size-4" /> Reprocessar
            </button>
          ) : undefined
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* ── Statements list ────────────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Histórico</h2>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="text-[11px] text-muted-foreground flex items-center gap-1 hover:text-foreground"
              >
                {filterCard ? cards.find((c) => c.id === filterCard)?.name ?? "Todos" : "Todos os cartões"}
                <ChevronDown className="size-3" />
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-44 glass rounded-xl shadow-xl py-1 text-[13px]">
                    <button
                      onClick={() => { setFilterCard(""); setFilterOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center justify-between ${!filterCard ? "text-primary" : ""}`}
                    >
                      Todos os cartões
                      {!filterCard && <CheckCircle2 className="size-3.5" />}
                    </button>
                    {cards.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setFilterCard(c.id); setFilterOpen(false); }}
                        className={`w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center justify-between ${filterCard === c.id ? "text-primary" : ""}`}
                      >
                        {c.name} •{c.last4}
                        {filterCard === c.id && <CheckCircle2 className="size-3.5" />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {filteredStatements.length === 0 ? (
            <div className="glass rounded-2xl p-5 text-center text-[13px] text-muted-foreground">
              Nenhuma fatura para este cartão.
            </div>
          ) : (
            filteredStatements.map((s) => {
              const c = cards.find((x) => x.id === s.cardId);
              const active = s.id === selected;
              const txCount = transactions.filter((t) => t.statementId === s.id).length;
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
                  <div className="text-[11px] text-muted-foreground mb-2">
                    {c?.name ?? "—"} •••• {c?.last4}
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="num text-lg font-semibold">{brl(s.total)}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {txCount || s.itemsCount} compras
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Statement detail ───────────────────────────────────────────── */}
        {current && card ? (
          <div className="lg:col-span-2 space-y-4">
            <GlassCard>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{card.bank}</div>
                  <h3 className="text-xl font-semibold mt-0.5">
                    {card.name} — {current.reference}
                  </h3>
                  <div className="text-[12px] text-muted-foreground mt-1 flex items-center gap-3">
                    <span>Fechamento {dateBR(current.closingDate)}</span>
                    <span>·</span>
                    <span>Vencimento {dateBR(current.dueDate)}</span>
                  </div>
                </div>
                <Pill tone={statusTone[current.status]}>
                  {current.status === "paga"
                    ? <Banknote className="size-3" />
                    : current.status === "importada"
                    ? <CheckCircle2 className="size-3" />
                    : current.status === "pendente"
                    ? <Clock className="size-3" />
                    : <AlertCircle className="size-3" />}
                  {current.status}
                </Pill>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
                <Mini label="Total da fatura" value={brl(current.total)} />
                <Mini label="Pagamento mínimo" value={brl(current.minimum)} />
                <Mini label="Limite usado" value={brl(card.used)} hint={`de ${brl(card.limit)}`} />
                <Mini label="Disponível" value={brl(card.limit - card.used)} positive />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleConfirmReview}
                  disabled={saving || current.status === "importada" || current.status === "paga"}
                  className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 disabled:opacity-40 transition"
                >
                  <CheckCircle2 className="size-3.5" />
                  {current.status === "importada" || current.status === "paga" ? "Já revisada" : "Confirmar revisão"}
                </button>
                <button
                  onClick={handleMarkPaid}
                  disabled={saving || current.status === "pendente" || current.status === "erro"}
                  className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 disabled:opacity-40 transition"
                >
                  <Banknote className="size-3.5" />
                  {current.status === "paga" ? "Desfazer pagamento" : "Marcar como paga"}
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={saving || items.length === 0}
                  className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 disabled:opacity-40 transition"
                >
                  <Copy className="size-3.5" /> Duplicar como manual
                </button>
                <button
                  onClick={() => setDialog("delete")}
                  className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 text-[var(--negative)] transition"
                >
                  <Trash2 className="size-3.5" /> Excluir fatura
                </button>
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="p-5 pb-3">
                <SectionTitle
                  title="Compras extraídas"
                  hint={`${items.length} ${items.length === 1 ? "item" : "itens"} · venc. ${dateBR(current.dueDate)}`}
                />
              </div>
              {items.length === 0 ? (
                <div className="px-5 pb-6 text-[13px] text-muted-foreground">
                  Nenhuma transação vinculada a esta fatura.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr className="border-y border-glass-border">
                        <th className="text-left font-medium px-5 py-2.5">Data</th>
                        <th className="text-left font-medium px-2 py-2.5">Estabelecimento</th>
                        <th className="text-left font-medium px-2 py-2.5">Categoria</th>
                        <th className="text-left font-medium px-2 py-2.5">Parcela</th>
                        <th className="text-left font-medium px-2 py-2.5">Status</th>
                        <th className="text-right font-medium px-5 py-2.5">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((t) => {
                        const cat = categories.find((c) => c.id === t.categoryId);
                        return (
                          <tr
                            key={t.id}
                            className="border-b border-glass-border/60 hover:bg-accent/20 transition"
                          >
                            <td className="px-5 py-3 text-muted-foreground whitespace-nowrap num">
                              {dateBR(t.date)}
                            </td>
                            <td className="px-2 py-3 font-medium max-w-[180px]">
                              <div className="truncate">{t.merchant}</div>
                              <div className="text-[11px] text-muted-foreground truncate">
                                {t.description !== t.merchant ? t.description : ""}
                              </div>
                            </td>
                            <td className="px-2 py-3">
                              <Pill tone="neutral">{cat?.icon} {cat?.name ?? "—"}</Pill>
                            </td>
                            <td className="px-2 py-3 text-muted-foreground num whitespace-nowrap">
                              {t.installment
                                ? `${String(t.installment.current).padStart(2, "0")}/${String(t.installment.total).padStart(2, "0")}`
                                : "—"}
                            </td>
                            <td className="px-2 py-3">
                              <Pill tone={t.status === "revisada" ? "positive" : "warning"}>
                                {t.status}
                              </Pill>
                            </td>
                            <td className="px-5 py-3 text-right num font-medium whitespace-nowrap">
                              {brl(Math.abs(t.amount))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-glass-border">
                        <td colSpan={5} className="px-5 py-3 text-[12px] text-muted-foreground">
                          {items.length} transações
                        </td>
                        <td className="px-5 py-3 text-right num font-semibold">
                          {brl(items.reduce((s, t) => s + Math.abs(t.amount), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        ) : (
          <div className="lg:col-span-2 glass rounded-2xl p-10 text-center text-muted-foreground text-sm">
            Selecione uma fatura para ver os detalhes.
          </div>
        )}
      </div>

      {/* ── Delete confirmation modal ──────────────────────────────────── */}
      {dialog === "delete" && current && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setDialog(null)}
        >
          <div
            className="relative w-full sm:max-w-md glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Excluir fatura</h2>
              <button
                onClick={() => setDialog(null)}
                title="Fechar"
                className="size-7 rounded-full hover:bg-accent/40 grid place-items-center transition"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-[13px] text-muted-foreground">
              Tem certeza que deseja excluir a fatura{" "}
              <span className="font-medium text-foreground">{current.reference}</span>?
              {items.length > 0 && (
                <> As <span className="font-medium text-foreground">{items.length} transações</span> vinculadas também serão excluídas.</>
              )}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDialog(null)}
                className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="h-9 px-4 rounded-xl bg-[var(--negative)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
              >
                {saving ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Mini({
  label, value, hint, positive,
}: {
  label: string; value: string; hint?: string; positive?: boolean;
}) {
  return (
    <div className="glass-soft rounded-xl p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-[16px] font-semibold num mt-0.5 ${positive ? "text-[var(--positive)]" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-[10.5px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
