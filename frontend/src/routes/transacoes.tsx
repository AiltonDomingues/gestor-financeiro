import { createFileRoute } from "@tanstack/react-router";
import {
  Star, Filter, Download, MoreHorizontal, Search,
  Plus, X, Check, Trash2, Pencil, BookmarkCheck, Tag as TagIcon,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl, dateBR } from "@/lib/format";
import { useMemo, useState, useRef } from "react";
import { resolveCategory } from "@/lib/selectors";
import type { Transaction, TransactionOrigin, TransactionStatus } from "@/domain/types";

export const Route = createFileRoute("/transacoes")({
  head: () => ({ meta: [{ title: "Transações • GS" }] }),
  component: Transacoes,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type FormState = {
  isExpense: boolean;
  date: string;
  merchant: string;
  description: string;
  amount: string;
  categoryId: string;
  cardId: string;
  origin: TransactionOrigin;
  status: TransactionStatus;
  note: string;
  starred: boolean;
};

type DialogMode = "add" | "edit" | "delete" | "bulk-delete" | "bulk-cat" | null;
type ActiveChip = "Este mês" | "Cartões" | "Manual" | "Recorrente" | "Pendentes" | "Maiores valores";

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm = (catId = "", cardId = ""): FormState => ({
  isExpense: true,
  date: todayISO(),
  merchant: "",
  description: "",
  amount: "",
  categoryId: catId,
  cardId,
  origin: "manual",
  status: "pendente",
  note: "",
  starred: false,
});

function formToTransaction(f: FormState): Omit<Transaction, "id"> {
  const raw = parseFloat(f.amount.replace(",", ".")) || 0;
  // Domain: negative = expense, positive = income
  const amount = f.isExpense ? -Math.abs(raw) : Math.abs(raw);
  return {
    date: new Date(f.date + "T12:00:00").toISOString(),
    merchant: f.merchant.trim(),
    description: f.description.trim() || f.merchant.trim(),
    amount,
    categoryId: f.categoryId,
    cardId: f.cardId || undefined,
    origin: f.origin,
    status: f.status,
    note: f.note.trim() || undefined,
    starred: f.starred || undefined,
  };
}

function transactionToForm(t: Transaction): FormState {
  return {
    isExpense: t.amount < 0,
    date: t.date.slice(0, 10),
    merchant: t.merchant,
    description: t.description,
    amount: Math.abs(t.amount).toString(),
    categoryId: t.categoryId,
    cardId: t.cardId ?? "",
    origin: t.origin,
    status: t.status,
    note: t.note ?? "",
    starred: t.starred ?? false,
  };
}

// ── Shared UI components ───────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({
  title, onClose, children,
}: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-lg glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            title="Fechar"
            className="size-7 rounded-full hover:bg-accent/40 grid place-items-center transition"
          >
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Row actions dropdown ───────────────────────────────────────────────────────

function RowMenu({
  t, onEdit, onDelete, onToggleStar, onToggleStatus,
}: {
  t: Transaction;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
  onToggleStatus: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        title="Ações"
        onClick={() => setOpen((v) => !v)}
        className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center transition"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-48 glass rounded-xl shadow-xl py-1 text-[13px]">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <Pencil className="size-3.5" /> Editar
            </button>
            <button
              onClick={() => { onToggleStar(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <Star className={`size-3.5 ${t.starred ? "fill-[var(--warning)] text-[var(--warning)]" : ""}`} />
              {t.starred ? "Remover favorito" : "Favoritar"}
            </button>
            <button
              onClick={() => { onToggleStatus(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <BookmarkCheck className="size-3.5" />
              {t.status === "revisada" ? "Marcar pendente" : "Marcar revisada"}
            </button>
            <div className="border-t border-glass-border/50 my-1" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 text-[var(--negative)] transition"
            >
              <Trash2 className="size-3.5" /> Excluir
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function Transacoes() {
  const {
    transactions, categories, cards, categoryRules,
    addTransaction, updateTransaction, deleteTransaction,
  } = useAppData();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const [activeChips, setActiveChips] = useState<Set<ActiveChip>>(
    new Set<ActiveChip>(["Este mês"]),
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filterCard, setFilterCard] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [target, setTarget] = useState<Transaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bulkCatId, setBulkCatId] = useState("");
  // Tracks whether user manually picked a category in the add modal.
  // While false, typing in the merchant field auto-fills the category via rules.
  const catUserPickedRef = useRef(false);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const list = useMemo(() => {
    let items = [...transactions];

    if (q) {
      const lq = q.toLowerCase();
      items = items.filter((t) =>
        (t.merchant + " " + t.description).toLowerCase().includes(lq),
      );
    }

    const now = new Date();
    if (activeChips.has("Este mês")) {
      items = items.filter((t) => {
        const d = new Date(t.date);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      });
    }
    if (activeChips.has("Cartões"))    items = items.filter((t) => !!t.cardId);
    if (activeChips.has("Manual"))     items = items.filter((t) => t.origin === "manual");
    if (activeChips.has("Recorrente")) items = items.filter((t) => t.origin === "recorrente");
    if (activeChips.has("Pendentes"))  items = items.filter((t) => t.status === "pendente");

    if (filterCard)   items = items.filter((t) => t.cardId === filterCard);
    if (filterCat)    items = items.filter((t) => t.categoryId === filterCat);
    if (filterOrigin) items = items.filter((t) => t.origin === filterOrigin);
    if (filterStatus) items = items.filter((t) => t.status === filterStatus);

    if (activeChips.has("Maiores valores")) {
      items.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
    } else {
      items.sort((a, b) => +new Date(b.date) - +new Date(a.date));
    }

    return items;
  }, [transactions, q, activeChips, filterCard, filterCat, filterOrigin, filterStatus]);

  const totalExpenses = list
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  // ── Selection ─────────────────────────────────────────────────────────────
  const allSelected = list.length > 0 && selectedIds.length === list.length;
  const toggle = (id: string) =>
    setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = () =>
    setSelectedIds(allSelected ? [] : list.map((t) => t.id));

  // ── Chips ─────────────────────────────────────────────────────────────────
  function toggleChip(chip: ActiveChip) {
    setActiveChips((prev) => {
      const next = new Set(prev);
      if (next.has(chip)) next.delete(chip);
      else next.add(chip);
      return next;
    });
  }

  function clearFilters() {
    setActiveChips(new Set<ActiveChip>());
    setFilterCard("");
    setFilterCat("");
    setFilterOrigin("");
    setFilterStatus("");
    setQ("");
  }

  // ── Dialog handlers ───────────────────────────────────────────────────────
  function openAdd() {
    catUserPickedRef.current = false;
    const defaultCat = categories.find((c) => (c.type ?? "expense") === "expense")?.id ?? categories[0]?.id ?? "";
    setForm(emptyForm(defaultCat, cards[0]?.id ?? ""));
    setTarget(null);
    setDialog("add");
  }
  function openEdit(t: Transaction) {
    setForm(transactionToForm(t));
    setTarget(t);
    setDialog("edit");
  }
  function openDelete(t: Transaction) { setTarget(t); setDialog("delete"); }
  function close() { setDialog(null); setTarget(null); }

  // ── CRUD ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.merchant.trim() || !form.amount) return;
    setSaving(true);
    try {
      if (dialog === "add") {
        await addTransaction(formToTransaction(form));
      } else if (dialog === "edit" && target) {
        await updateTransaction(target.id, formToTransaction(form));
      }
      close();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setSaving(true);
    try {
      await deleteTransaction(target.id);
      setSelectedIds((s) => s.filter((id) => id !== target.id));
      close();
    } finally { setSaving(false); }
  }

  async function handleBulkDelete() {
    setSaving(true);
    try {
      for (const id of selectedIds) await deleteTransaction(id);
      setSelectedIds([]);
      close();
    } finally { setSaving(false); }
  }

  async function handleBulkCat() {
    if (!bulkCatId) return;
    setSaving(true);
    try {
      for (const id of selectedIds) await updateTransaction(id, { categoryId: bulkCatId });
      setSelectedIds([]);
      close();
    } finally { setSaving(false); }
  }

  async function handleBulkReviewed() {
    for (const id of selectedIds) await updateTransaction(id, { status: "revisada" });
    setSelectedIds([]);
  }

  async function handleToggleStar(t: Transaction) {
    await updateTransaction(t.id, { starred: !t.starred });
  }

  async function handleToggleStatus(t: Transaction) {
    await updateTransaction(t.id, {
      status: t.status === "revisada" ? "pendente" : "revisada",
    });
  }

  // ── Export CSV ────────────────────────────────────────────────────────────
  function handleExport() {
    const headers = ["Data", "Estabelecimento", "Descrição", "Categoria", "Cartão", "Origem", "Status", "Valor"];
    const rows = list.map((t) => {
      const cat = categories.find((c) => c.id === t.categoryId);
      const card = cards.find((c) => c.id === t.cardId);
      return [
        dateBR(t.date), t.merchant, t.description,
        cat?.name ?? "", card ? `${card.name} ${card.last4}` : "",
        t.origin, t.status,
        (t.amount < 0 ? "-" : "+") + Math.abs(t.amount).toFixed(2).replace(".", ","),
      ].map((v) => `"${v}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "transacoes.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const chips: ActiveChip[] = ["Este mês", "Cartões", "Manual", "Recorrente", "Pendentes", "Maiores valores"];
  const hasAdvancedFilter = !!(filterCard || filterCat || filterOrigin || filterStatus);
  const hasAnyFilter = hasAdvancedFilter || activeChips.size > 0 || !!q;
  const inputCls = "w-full glass-soft rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 bg-transparent";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transações"
        subtitle={`${list.length} transações no período · ${brl(totalExpenses)} em despesas`}
        actions={
          <>
            <button
              onClick={handleExport}
              className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 transition flex items-center gap-1.5"
            >
              <Download className="size-4" /> Exportar
            </button>
            <button
              onClick={openAdd}
              className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Plus className="size-4" /> Nova
            </button>
          </>
        }
      />

      {/* ── Search + chips ────────────────────────────────────────────────── */}
      <GlassCard className="p-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por estabelecimento, descrição…"
              className="w-full bg-transparent pl-9 pr-3 h-9 text-sm outline-none"
            />
          </div>
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className={`h-9 px-3 rounded-xl text-[12.5px] flex items-center gap-1.5 transition ${hasAdvancedFilter ? "bg-primary/20 text-primary border border-primary/30" : "glass-soft hover:bg-accent/40"}`}
          >
            <Filter className="size-3.5" /> Filtros
            {hasAdvancedFilter && (
              <span className="size-4 rounded-full bg-primary text-primary-foreground text-[10px] grid place-items-center">
                {[filterCard, filterCat, filterOrigin, filterStatus].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => toggleChip(c)}
              className={`px-2.5 py-1 rounded-full text-[11.5px] transition ${activeChips.has(c) ? "bg-primary/20 text-primary border border-primary/30" : "glass-soft hover:bg-accent/40 text-muted-foreground"}`}
            >
              {c}
            </button>
          ))}
          {hasAnyFilter && (
            <button
              onClick={clearFilters}
              className="px-2.5 py-1 rounded-full text-[11.5px] glass-soft hover:bg-accent/40 text-muted-foreground flex items-center gap-1"
            >
              <X className="size-3" /> Limpar
            </button>
          )}
        </div>

        {/* Advanced filter panel */}
        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-glass-border grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              {
                label: "Cartão", value: filterCard, set: setFilterCard,
                options: cards.map((c) => ({ value: c.id, label: `${c.name} •${c.last4}` })),
              },
              {
                label: "Categoria", value: filterCat, set: setFilterCat,
                options: categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` })),
              },
              {
                label: "Origem", value: filterOrigin, set: setFilterOrigin,
                options: [
                  { value: "fatura", label: "Fatura" },
                  { value: "manual", label: "Manual" },
                  { value: "recorrente", label: "Recorrente" },
                  { value: "ajuste", label: "Ajuste" },
                ],
              },
              {
                label: "Status", value: filterStatus, set: setFilterStatus,
                options: [
                  { value: "pendente", label: "Pendente" },
                  { value: "revisada", label: "Revisada" },
                  { value: "ignorada", label: "Ignorada" },
                ],
              },
            ] as const).map(({ label, value, set, options }) => (
              <div key={label} className="space-y-1">
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</label>
                <CustomSelect
                  size="sm"
                  value={value}
                  onChange={(v) => set(v)}
                  options={[{ value: "", label: "Todos" }, ...options]}
                />
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ── Bulk action bar ───────────────────────────────────────────────── */}
      {selectedIds.length > 0 && (
        <div className="glass rounded-2xl p-3 flex flex-wrap items-center gap-2 text-[13px]">
          <span className="font-medium">
            {selectedIds.length} selecionada{selectedIds.length > 1 ? "s" : ""}
          </span>
          <div className="w-px h-5 bg-glass-border mx-1" />
          <button
            onClick={() => { setBulkCatId(categories[0]?.id ?? ""); setDialog("bulk-cat"); }}
            className="px-2.5 py-1 rounded-lg glass-soft hover:bg-accent/40 flex items-center gap-1.5"
          >
            <TagIcon className="size-3.5" /> Categorizar
          </button>
          <button
            onClick={handleBulkReviewed}
            className="px-2.5 py-1 rounded-lg glass-soft hover:bg-accent/40 flex items-center gap-1.5"
          >
            <Check className="size-3.5" /> Marcar revisadas
          </button>
          <button
            onClick={() => setDialog("bulk-delete")}
            className="px-2.5 py-1 rounded-lg glass-soft hover:bg-accent/40 text-[var(--negative)] flex items-center gap-1.5"
          >
            <Trash2 className="size-3.5" /> Excluir
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="ml-auto text-[12px] text-muted-foreground hover:text-foreground"
          >
            Limpar
          </button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <GlassCard className="p-0 overflow-hidden">
        {list.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-2 text-center">
            <Search className="size-8 text-muted-foreground/40" />
            <div className="text-[14px] font-medium">Nenhuma transação encontrada</div>
            <p className="text-[12px] text-muted-foreground">
              Ajuste os filtros ou adicione uma nova transação.
            </p>
            <button
              onClick={openAdd}
              className="mt-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Plus className="size-4" /> Nova transação
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-glass-border">
                  <th className="px-4 py-3 w-8">
                    <input
                      type="checkbox"
                      title="Selecionar todos"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="size-3.5 accent-[oklch(0.72_0.16_255)]"
                    />
                  </th>
                  <th className="text-left font-medium px-2 py-3">Data</th>
                  <th className="text-left font-medium px-2 py-3">Estabelecimento</th>
                  <th className="text-left font-medium px-2 py-3">Categoria</th>
                  <th className="text-left font-medium px-2 py-3">Cartão</th>
                  <th className="text-left font-medium px-2 py-3">Origem</th>
                  <th className="text-left font-medium px-2 py-3">Status</th>
                  <th className="text-right font-medium px-4 py-3">Valor</th>
                  <th className="px-2 py-3 w-8" />
                </tr>
              </thead>
              <tbody>
                {list.map((t) => {
                  const cat = categories.find((c) => c.id === t.categoryId);
                  const card = cards.find((c) => c.id === t.cardId);
                  const isSel = selectedIds.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-glass-border/60 transition ${isSel ? "bg-primary/10" : "hover:bg-accent/20"}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          title="Selecionar"
                          checked={isSel}
                          onChange={() => toggle(t.id)}
                          className="size-3.5 accent-[oklch(0.72_0.16_255)]"
                        />
                      </td>
                      <td className="px-2 py-3 text-muted-foreground whitespace-nowrap num">
                        {dateBR(t.date)}
                      </td>
                      <td className="px-2 py-3 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {t.starred && (
                            <Star className="size-3 shrink-0 fill-[var(--warning)] text-[var(--warning)]" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{t.merchant}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {t.description}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-3">
                        <Pill tone="neutral">{cat?.icon} {cat?.name ?? "—"}</Pill>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground whitespace-nowrap text-[12px]">
                        {card
                          ? `${card.name.split(" ").slice(-1)[0] ?? card.name} •••• ${card.last4}`
                          : "—"}
                      </td>
                      <td className="px-2 py-3 text-muted-foreground capitalize text-[12px]">
                        {t.origin}
                      </td>
                      <td className="px-2 py-3">
                        <Pill tone={t.status === "revisada" ? "positive" : "warning"}>
                          {t.status}
                        </Pill>
                      </td>
                      <td
                        className={`px-4 py-3 text-right num font-medium whitespace-nowrap ${t.amount > 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}
                      >
                        {t.amount > 0 ? "+" : "−"}{brl(Math.abs(t.amount))}
                      </td>
                      <td className="px-2 py-3">
                        <RowMenu
                          t={t}
                          onEdit={() => openEdit(t)}
                          onDelete={() => openDelete(t)}
                          onToggleStar={() => handleToggleStar(t)}
                          onToggleStatus={() => handleToggleStatus(t)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 border-t border-glass-border flex items-center justify-between text-[12px] text-muted-foreground">
              <span>{list.length} transações</span>
              <span>
                Total despesas:{" "}
                <span className="font-semibold num text-[var(--negative)]">{brl(totalExpenses)}</span>
              </span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* ── Add / Edit modal ──────────────────────────────────────────────── */}
      {(dialog === "add" || dialog === "edit") && (
        <Modal
          title={dialog === "add" ? "Nova transação" : "Editar transação"}
          onClose={close}
        >
          <div className="grid grid-cols-2 gap-3">
            {/* Type toggle */}
            <div className="col-span-2 flex rounded-xl overflow-hidden border border-glass-border">
              <button
                className={`flex-1 py-2 text-[13px] font-medium transition ${form.isExpense ? "bg-[var(--negative)]/15 text-[var(--negative)]" : "hover:bg-accent/20 text-muted-foreground"}`}
                onClick={() => {
                  const cat = categories.find((c) => (c.type ?? "expense") === "expense")?.id ?? "";
                  catUserPickedRef.current = false;
                  setForm((f) => ({ ...f, isExpense: true, categoryId: cat, cardId: cards[0]?.id ?? "" }));
                }}
              >
                Despesa
              </button>
              <button
                className={`flex-1 py-2 text-[13px] font-medium transition ${!form.isExpense ? "bg-[var(--positive)]/15 text-[var(--positive)]" : "hover:bg-accent/20 text-muted-foreground"}`}
                onClick={() => {
                  const cat = categories.find((c) => c.type === "income")?.id ?? "";
                  catUserPickedRef.current = false;
                  setForm((f) => ({ ...f, isExpense: false, categoryId: cat, cardId: "" }));
                }}
              >
                Receita
              </button>
            </div>

            <Field label="Data">
              <input
                type="date"
                title="Data da transação"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className={inputCls}
              />
            </Field>
            <Field label="Valor (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <div className="col-span-2">
              <Field label={form.isExpense ? "Estabelecimento" : "Origem / Fonte"}>
                <input
                  type="text"
                  placeholder={form.isExpense ? "Ex: iFood" : "Ex: Empresa, Cliente"}
                  value={form.merchant}
                  onChange={(e) => {
                    const merchant = e.target.value;
                    setForm((f) => {
                      if (dialog === "add" && !catUserPickedRef.current) {
                        const auto = resolveCategory(merchant, categoryRules);
                        return { ...f, merchant, ...(auto ? { categoryId: auto } : {}) };
                      }
                      return { ...f, merchant };
                    });
                  }}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Descrição (opcional)">
                <input
                  type="text"
                  placeholder="Detalhes adicionais"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Categoria">
              <CustomSelect
                value={form.categoryId}
                onChange={(v) => { catUserPickedRef.current = true; setForm((f) => ({ ...f, categoryId: v })); }}
                options={categories
                  .filter((c) => form.isExpense ? (c.type ?? "expense") === "expense" : c.type === "income")
                  .map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
              />
            </Field>
            {form.isExpense && (
              <Field label="Cartão">
                <CustomSelect
                  value={form.cardId}
                  onChange={(v) => setForm((f) => ({ ...f, cardId: v }))}
                  options={[{ value: "", label: "Nenhum" }, ...cards.map((c) => ({ value: c.id, label: `${c.name} •${c.last4}` }))]}
                />
              </Field>
            )}
            {form.isExpense && (
              <Field label="Origem">
                <CustomSelect
                  value={form.origin}
                  onChange={(v) => setForm((f) => ({ ...f, origin: v as TransactionOrigin }))}
                  options={[
                    { value: "manual", label: "Manual" },
                    { value: "fatura", label: "Fatura" },
                    { value: "recorrente", label: "Recorrente" },
                    { value: "ajuste", label: "Ajuste" },
                  ]}
                />
              </Field>
            )}
            <Field label="Status">
              <CustomSelect
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as TransactionStatus }))}
                options={[
                  { value: "pendente", label: "Pendente" },
                  { value: "revisada", label: "Revisada" },
                  { value: "ignorada", label: "Ignorada" },
                ]}
              />
            </Field>

            <div className="col-span-2">
              <Field label="Nota (opcional)">
                <input
                  type="text"
                  placeholder="Observação"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                id="starred"
                title="Favoritar"
                checked={form.starred}
                onChange={(e) => setForm((f) => ({ ...f, starred: e.target.checked }))}
                className="size-4 accent-[oklch(0.72_0.16_255)]"
              />
              <label htmlFor="starred" className="text-[13px] text-muted-foreground cursor-pointer">
                Marcar como favorita
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={close}
              className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.merchant.trim() || !form.amount}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Salvando…" : dialog === "add" ? "Adicionar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      {dialog === "delete" && target && (
        <Modal title="Excluir transação" onClose={close}>
          <p className="text-[13px] text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">{target.merchant}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={close}
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
        </Modal>
      )}

      {/* ── Bulk delete confirmation ──────────────────────────────────────── */}
      {dialog === "bulk-delete" && (
        <Modal title="Excluir transações" onClose={close}>
          <p className="text-[13px] text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">
              {selectedIds.length} transações
            </span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={close}
              className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-[var(--negative)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Excluindo…" : `Excluir ${selectedIds.length}`}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Bulk categorize ───────────────────────────────────────────────── */}
      {dialog === "bulk-cat" && (
        <Modal title="Categorizar em lote" onClose={close}>
          <p className="text-[13px] text-muted-foreground">
            Aplicar categoria a{" "}
            <span className="font-medium text-foreground">
              {selectedIds.length} transações
            </span>:
          </p>
          <CustomSelect
            value={bulkCatId}
            onChange={setBulkCatId}
            options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={close}
              className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleBulkCat}
              disabled={saving || !bulkCatId}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Aplicando…" : "Aplicar"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
