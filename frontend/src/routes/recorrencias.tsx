import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, MoreHorizontal } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl, dateBR, toMonthly } from "@/lib/format";
import { useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { RecurringEntry, RecurringPeriodicity, RecurringType, RecurringPaymentMethod, RecurringDayRule } from "@/domain/types";

export const Route = createFileRoute("/recorrencias")({
  head: () => ({ meta: [{ title: "Recorrências • GS" }] }),
  component: Recorrencias,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterTab = "all" | "despesa" | "receita" | "disabled";
type DialogMode = "add" | "edit" | "delete" | null;

type FormState = {
  name: string;
  amount: string;
  type: RecurringType;
  categoryId: string;
  periodicity: RecurringPeriodicity;
  next: string;
  paymentMethod: RecurringPaymentMethod;
  dayRule: RecurringDayRule;
  dueDay: string;
};

const emptyForm = (): FormState => ({
  name: "",
  amount: "",
  type: "despesa",
  categoryId: "",
  periodicity: "Mensal",
  next: "",
  paymentMethod: "pix",
  dayRule: "fixed",
  dueDay: "",
});

const PAYMENT_METHOD_OPTIONS: { value: RecurringPaymentMethod; label: string; hint: string }[] = [
  { value: "pix",              label: "PIX",              hint: "Afeta o caixa imediatamente" },
  { value: "debito_automatico", label: "Débito automático", hint: "Afeta o caixa imediatamente" },
  { value: "cartao",           label: "Cartão de crédito", hint: "Entra na fatura, não no caixa" },
];

const PAYMENT_METHOD_LABEL: Record<RecurringPaymentMethod, string> = {
  pix: "PIX",
  debito_automatico: "Débito",
  cartao: "Cartão",
};

const PERIODICITY_OPTIONS: RecurringPeriodicity[] = ["Semanal", "Quinzenal", "Mensal", "Anual"];

const DAY_RULE_OPTIONS: { value: RecurringDayRule; label: string }[] = [
  { value: "fixed",              label: "Dia fixo" },
  { value: "last_business_day",  label: "Último dia útil do mês" },
  { value: "prev_business_day",  label: "Dia útil anterior ao dia X" },
];

function isWeekend(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

function prevBusinessDayDate(year: number, month: number, targetDay: number): Date {
  const d = new Date(year, month, targetDay);
  while (isWeekend(d)) d.setDate(d.getDate() - 1);
  return d;
}

function lastBusinessDayDate(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0); // last day of month
  while (isWeekend(d)) d.setDate(d.getDate() - 1);
  return d;
}

function computeNextByRule(dayRule: RecurringDayRule, dueDay?: number): string {
  if (dayRule === "fixed") return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let d: Date;
  const tryMonth = (y: number, m: number) =>
    dayRule === "last_business_day"
      ? lastBusinessDayDate(y, m)
      : prevBusinessDayDate(y, m, dueDay ?? 15);
  d = tryMonth(today.getFullYear(), today.getMonth());
  if (d < today) d = tryMonth(today.getFullYear(), today.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

const FILTER_LABELS: Record<FilterTab, string> = {
  all: "Todos",
  despesa: "Despesas",
  receita: "Receitas",
  disabled: "Desativados",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  "w-full glass-soft rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 bg-transparent";

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

// ── Row action menu ───────────────────────────────────────────────────────────

function RecurringMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen() {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        title="Ações"
        onClick={handleOpen}
        className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center transition"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 w-40 glass rounded-xl shadow-xl py-1 text-[13px]"
            style={{ top: pos.top, right: pos.right }}
          >
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <Pencil className="size-3.5" /> Editar
            </button>
            <div className="border-t border-glass-border/50 my-1" />
            <button
              onClick={() => { onDelete(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 text-[var(--negative)] transition"
            >
              <Trash2 className="size-3.5" /> Excluir
            </button>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function Recorrencias() {
  const { categories, recurring, addRecurring, updateRecurring, deleteRecurring } = useAppData();

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [target, setTarget] = useState<RecurringEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalDesp = recurring
    .filter((r) => r.type === "despesa" && r.enabled)
    .reduce((s, r) => s + toMonthly(r.amount, r.periodicity), 0);
  const totalRec = recurring
    .filter((r) => r.type === "receita" && r.enabled)
    .reduce((s, r) => s + toMonthly(r.amount, r.periodicity), 0);
  const saldo = totalRec - totalDesp;

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...recurring];
    if (filterTab === "despesa") list = list.filter((r) => r.type === "despesa" && r.enabled);
    else if (filterTab === "receita") list = list.filter((r) => r.type === "receita" && r.enabled);
    else if (filterTab === "disabled") list = list.filter((r) => !r.enabled);
    list.sort((a, b) => +new Date(a.next) - +new Date(b.next));
    return list;
  }, [recurring, filterTab]);

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function todayISO() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function openAdd() {
    const defaultCat = categories.find((c) => (c.type ?? "expense") === "expense")?.id ?? categories[0]?.id ?? "";
    setForm({ ...emptyForm(), next: todayISO(), categoryId: defaultCat });
    setTarget(null);
    setDialog("add");
  }

  function openEdit(r: RecurringEntry) {
    setForm({
      name: r.name,
      amount: String(r.amount),
      type: r.type,
      categoryId: r.categoryId,
      periodicity: r.periodicity,
      next: r.next.slice(0, 10),
      paymentMethod: r.paymentMethod ?? "pix",
      dayRule: r.dayRule ?? "fixed",
      dueDay: r.dueDay ? String(r.dueDay) : "",
    });
    setTarget(r);
    setDialog("edit");
  }

  function openDelete(r: RecurringEntry) {
    setTarget(r);
    setDialog("delete");
  }

  function close() { setDialog(null); setTarget(null); }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const amt = parseFloat(form.amount.replace(",", "."));
    if (!form.name.trim() || isNaN(amt) || amt <= 0 || !form.next || !form.categoryId) return;
    setSaving(true);
    try {
      const dueDayNum = form.dueDay ? parseInt(form.dueDay) : undefined;
      const payload = {
        name: form.name.trim(),
        amount: amt,
        type: form.type,
        categoryId: form.categoryId,
        periodicity: form.periodicity,
        next: form.next,
        enabled: true,
        paymentMethod: form.type === "despesa" ? form.paymentMethod : undefined,
        dayRule: form.periodicity === "Mensal" && form.dayRule !== "fixed" ? form.dayRule : undefined,
        dueDay: form.periodicity === "Mensal" && form.dayRule === "prev_business_day" ? dueDayNum : undefined,
      };
      if (dialog === "add") await addRecurring(payload);
      else if (dialog === "edit" && target) await updateRecurring(target.id, payload);
      close();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!target) return;
    setSaving(true);
    try { await deleteRecurring(target.id); close(); }
    finally { setSaving(false); }
  }

  // ── Select options ────────────────────────────────────────────────────────

  const catOptions = useMemo(() => {
    const targetType = form.type === "despesa" ? "expense" : "income";
    return categories
      .filter((c) => (c.type ?? "expense") === targetType)
      .map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }));
  }, [categories, form.type]);
  const periodicityOptions = PERIODICITY_OPTIONS.map((p) => ({ value: p, label: p }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recorrencias"
        subtitle="Assinaturas, contas fixas e receitas previstas."
        actions={
          <button
            onClick={openAdd}
            className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"
          >
            <Plus className="size-4" /> Nova recorrencia
          </button>
        }
      />

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Despesas recorrentes</div>
          <div className="num text-2xl font-semibold mt-1 text-[var(--negative)]">{brl(totalDesp)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">por mes (ativas)</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Receitas recorrentes</div>
          <div className="num text-2xl font-semibold mt-1 text-[var(--positive)]">{brl(totalRec)}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">por mes (ativas)</div>
        </div>
        <div className="glass rounded-2xl p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Saldo recorrente</div>
          <div className={`num text-2xl font-semibold mt-1 ${saldo >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
            {brl(saldo)}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">previsto/mes</div>
        </div>
      </div>

      {/* Filter tabs */}
      {recurring.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "despesa", "receita", "disabled"] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`h-8 px-3 rounded-lg text-[12.5px] transition ${
                filterTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "glass-soft hover:bg-accent/40"
              }`}
            >
              {FILTER_LABELS[tab]}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {filtered.length > 0 ? (
        <GlassCard className="p-0 overflow-hidden">
          <div className="divide-y divide-glass-border">
            {filtered.map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-5 py-3.5 hover:bg-accent/10 transition ${!r.enabled ? "opacity-50" : ""}`}
                >
                  <div className="size-10 rounded-xl glass-soft grid place-items-center text-lg shrink-0">
                    {cat?.icon ?? "🔁"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-medium truncate">{r.name}</div>
                    <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                      <span>{cat?.name ?? "—"}</span>
                      <span className="opacity-40">·</span>
                      <span>{r.periodicity}</span>
                      {r.periodicity === "Mensal" && r.dayRule === "last_business_day" && (
                        <><span className="opacity-40">·</span><span>últ. dia útil</span></>
                      )}
                      {r.periodicity === "Mensal" && r.dayRule === "prev_business_day" && (
                        <><span className="opacity-40">·</span><span>dia útil antes do {r.dueDay}</span></>
                      )}
                      <span className="opacity-40">·</span>
                      <span>Prox. {dateBR(r.next)}</span>
                    </div>
                  </div>
                  <Pill tone={r.type === "receita" ? "positive" : "neutral"}>{r.type}</Pill>
                  {r.type === "despesa" && (
                    <Pill tone={r.paymentMethod === "cartao" ? "info" : "neutral"}>
                      {PAYMENT_METHOD_LABEL[r.paymentMethod ?? "pix"]}
                    </Pill>
                  )}
                  <div
                    className={`num text-[14px] font-semibold w-28 text-right shrink-0 ${
                      r.type === "receita" ? "text-[var(--positive)]" : ""
                    }`}
                  >
                    {r.type === "receita" ? "+" : "−"}{brl(r.amount)}
                  </div>
                  {/* Controlled toggle */}
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      title={r.enabled ? "Desativar" : "Ativar"}
                      onChange={(e) => updateRecurring(r.id, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4" />
                  </label>
                  <RecurringMenu onEdit={() => openEdit(r)} onDelete={() => openDelete(r)} />
                </div>
              );
            })}
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <p className="text-[13px] text-muted-foreground text-center py-8">
            {recurring.length === 0
              ? "Nenhuma recorrencia criada. Clique em Nova recorrencia para comecar."
              : "Nenhuma recorrencia nesta categoria."}
          </p>
        </GlassCard>
      )}

      {/* ── Add / Edit modal ──────────────────────────────────────────────────── */}
      {(dialog === "add" || dialog === "edit") && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full sm:max-w-md glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {dialog === "add" ? "Nova recorrencia" : "Editar recorrencia"}
              </h2>
              <button title="Fechar" onClick={close} className="size-7 rounded-full hover:bg-accent/40 grid place-items-center transition">
                <X className="size-4" />
              </button>
            </div>

            {/* Type toggle */}
            <Field label="Tipo">
              <div className="grid grid-cols-2 gap-2">
                {(["despesa", "receita"] as RecurringType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      const targetType = t === "despesa" ? "expense" : "income";
                      const first = categories.find((c) => (c.type ?? "expense") === targetType)?.id ?? "";
                      setForm((f) => ({ ...f, type: t, categoryId: first }));
                    }}
                    className={`h-9 rounded-xl text-[13px] capitalize transition ${
                      form.type === t
                        ? t === "despesa"
                          ? "bg-[var(--negative)]/20 ring-2 ring-[var(--negative)] text-[var(--negative)]"
                          : "bg-[var(--positive)]/20 ring-2 ring-[var(--positive)] text-[var(--positive)]"
                        : "glass-soft hover:bg-accent/40"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            {/* Payment method — only for despesas */}
            {form.type === "despesa" && (
              <Field label="Forma de pagamento">
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, paymentMethod: opt.value }))}
                      className={`px-2 py-2.5 rounded-xl text-[12px] text-center transition leading-tight ${
                        form.paymentMethod === opt.value
                          ? opt.value === "cartao"
                            ? "bg-primary/20 ring-2 ring-primary text-primary"
                            : "bg-[var(--positive)]/15 ring-2 ring-[var(--positive)] text-[var(--positive)]"
                          : "glass-soft hover:bg-accent/40 text-muted-foreground"
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </Field>
            )}

            <Field label="Nome">
              <input
                type="text"
                placeholder="Ex: Netflix, Aluguel, Salario"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
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
              <Field label="Periodicidade">
                <CustomSelect
                  value={form.periodicity}
                  onChange={(v) => setForm((f) => ({ ...f, periodicity: v as RecurringPeriodicity }))}
                  options={periodicityOptions}
                />
              </Field>
            </div>

            <Field label="Categoria">
              <CustomSelect
                value={form.categoryId}
                onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                options={catOptions}
              />
            </Field>

            {/* Business-day rule — only for monthly */}
            {form.periodicity === "Mensal" && (
              <Field label="Regra de vencimento">
                <div className="space-y-2">
                  <CustomSelect
                    value={form.dayRule}
                    onChange={(v) => {
                      const rule = v as RecurringDayRule;
                      const computed = rule !== "fixed"
                        ? computeNextByRule(rule, form.dueDay ? parseInt(form.dueDay) : undefined)
                        : "";
                      setForm((f) => ({ ...f, dayRule: rule, next: computed || f.next }));
                    }}
                    options={DAY_RULE_OPTIONS}
                  />
                  {form.dayRule === "prev_business_day" && (
                    <input
                      type="number"
                      min={1}
                      max={31}
                      placeholder="Dia alvo (ex: 15)"
                      value={form.dueDay}
                      onChange={(e) => {
                        const val = e.target.value;
                        const computed = val ? computeNextByRule("prev_business_day", parseInt(val)) : "";
                        setForm((f) => ({ ...f, dueDay: val, next: computed || f.next }));
                      }}
                      className={inputCls}
                    />
                  )}
                </div>
              </Field>
            )}

            <Field label={
              form.type === "receita"
                ? form.dayRule !== "fixed" ? "Próximo recebimento (calculado)" : "Próximo recebimento"
                : form.dayRule !== "fixed" ? "Próxima cobrança (calculada)" : "Proxima cobranca"
            }>
              <input
                type="date"
                title="Proxima data de cobranca"
                value={form.next}
                onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))}
                className={inputCls}
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <button onClick={close} className="flex-1 h-10 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.amount || !form.next || !form.categoryId}
                className="flex-1 h-10 rounded-xl text-[13px] bg-primary text-primary-foreground transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ───────────────────────────────────────────────────────── */}
      {dialog === "delete" && target && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">Excluir recorrencia</h2>
            <p className="text-[13px] text-muted-foreground">
              Tem a certeza que quer excluir{" "}
              <span className="font-medium text-foreground">{target.name}</span>? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <button onClick={close} className="flex-1 h-10 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 h-10 rounded-xl text-[13px] bg-[var(--negative)] text-white transition disabled:opacity-50"
              >
                {saving ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
