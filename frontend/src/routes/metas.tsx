import { createFileRoute } from "@tanstack/react-router";
import { Plus, MoreHorizontal, Check, Pencil, Trash2, X, PiggyBank, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl, dateBR } from "@/lib/format";
import { useMemo, useState } from "react";
import type { Goal, GoalStatus } from "@/domain/types";

export const Route = createFileRoute("/metas")({
  head: () => ({ meta: [{ title: "Metas • GS" }] }),
  component: Metas,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type DialogMode = "add" | "edit" | "deposit" | "delete" | null;
type FilterTab = "all" | "active" | "completed" | "archived";

type FormState = {
  name: string;
  target: string;
  current: string;
  deadline: string;
  icon: string;
};

const emptyForm = (): FormState => ({
  name: "",
  target: "",
  current: "",
  deadline: "",
  icon: "🎯",
});

function goalToForm(g: Goal): FormState {
  return {
    name: g.name,
    target: String(g.target),
    current: String(g.current),
    deadline: g.deadline.slice(0, 10),
    icon: g.icon,
  };
}

const FILTER_LABELS: Record<FilterTab, string> = {
  all: "Todas",
  active: "Ativas",
  completed: "Concluidas",
  archived: "Arquivadas",
};

const STATUS_FILTER_MAP: Record<FilterTab, GoalStatus[] | null> = {
  all: null,
  active: ["active"],
  completed: ["completed"],
  archived: ["archived"],
};

const ICONS = ["🎯","💰","✈️","🏠","🚗","📱","💻","🎓","💍","👶","🐶","🌍","⛵","🏋️","🏖️","🎸","🎮","🍽️","📚","🌱"];

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

// ── Mini calendar (no external deps, SSR-safe) ───────────────────────────────

const MONTH_NAMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAY_LABELS = ["D","S","T","Q","Q","S","S"];

function MiniCalendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const init = value ? new Date(value + "T12:00:00") : today;
  const [vy, setVy] = useState(init.getFullYear());
  const [vm, setVm] = useState(init.getMonth());

  const selParts = value ? value.split("-").map(Number) : null;

  function prevMonth() {
    if (vm === 0) { setVy((y) => y - 1); setVm(11); }
    else setVm((m) => m - 1);
  }
  function nextMonth() {
    if (vm === 11) { setVy((y) => y + 1); setVm(0); }
    else setVm((m) => m + 1);
  }

  const firstDay = new Date(vy, vm, 1).getDay();
  const totalDays = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  function select(day: number) {
    const m = String(vm + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${vy}-${m}-${d}`);
  }

  const isSel = (day: number) =>
    selParts ? selParts[0] === vy && selParts[1] === vm + 1 && selParts[2] === day : false;
  const isTod = (day: number) =>
    today.getFullYear() === vy && today.getMonth() === vm && today.getDate() === day;

  return (
    <div className="p-3 select-none">
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} title="Mes anterior" className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center transition">
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[13px] font-medium">{MONTH_NAMES[vm]} {vy}</span>
        <button type="button" onClick={nextMonth} title="Proximo mes" className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center transition">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((l, i) => (
          <div key={i} className="h-7 grid place-items-center text-[10.5px] font-medium text-muted-foreground">{l}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) =>
          day === null ? (
            <div key={`e${i}`} />
          ) : (
            <button
              key={day}
              type="button"
              onClick={() => select(day)}
              className={`h-8 w-full rounded-lg text-[12.5px] grid place-items-center transition ${
                isSel(day)
                  ? "bg-primary text-primary-foreground font-semibold"
                  : isTod(day)
                  ? "ring-1 ring-primary text-primary font-medium hover:bg-accent/40"
                  : "hover:bg-accent/40"
              }`}
            >
              {day}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-1">
      <button
        type="button"
        title="Selecionar prazo"
        onClick={() => setOpen((v) => !v)}
        className="w-full glass-soft rounded-xl px-3 py-2 text-sm flex items-center justify-between hover:bg-accent/40 focus-visible:ring-1 focus-visible:ring-primary/50 transition"
      >
        <span className={value ? "" : "text-muted-foreground"}>
          {value ? dateBR(value) : "Selecionar data"}
        </span>
        <CalendarIcon className="size-4 text-muted-foreground shrink-0" />
      </button>
      {open && (
        <div className="glass rounded-2xl overflow-hidden shadow-xl">
          <MiniCalendar value={value} onChange={(v) => { onChange(v); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

// ── Row menu ──────────────────────────────────────────────────────────────────

function GoalMenu({
  goal,
  onEdit,
  onDeposit,
  onToggleArchive,
  onDelete,
}: {
  goal: Goal;
  onEdit: () => void;
  onDeposit: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        title="Acoes"
        onClick={() => setOpen((v) => !v)}
        className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center transition"
      >
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-52 glass rounded-xl shadow-xl py-1 text-[13px]">
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <Pencil className="size-3.5" /> Editar meta
            </button>
            <button
              onClick={() => { onDeposit(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <PiggyBank className="size-3.5" /> Registrar aporte
            </button>
            <button
              onClick={() => { onToggleArchive(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <Check className="size-3.5" />
              {goal.status === "archived" ? "Reativar meta" : "Arquivar meta"}
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

// ── Main component ────────────────────────────────────────────────────────────

function Metas() {
  const { goals, addGoal, updateGoal, deleteGoal, transactions, investments, investmentMoves } = useAppData();

  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [target, setTarget] = useState<Goal | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [depositAmount, setDepositAmount] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const statusFilter = STATUS_FILTER_MAP[filterTab];
    let list = statusFilter
      ? goals.filter((g) => statusFilter.includes(g.status))
      : [...goals];
    // Sort: active first, then completed, archived last; within group by deadline asc
    list.sort((a, b) => {
      const order: Record<GoalStatus, number> = { active: 0, completed: 1, archived: 2 };
      const od = order[a.status] - order[b.status];
      if (od !== 0) return od;
      return +new Date(a.deadline) - +new Date(b.deadline);
    });
    return list;
  }, [goals, filterTab]);

  // ── Dialog handlers ───────────────────────────────────────────────────────

  function openAdd() {
    setForm(emptyForm());
    setTarget(null);
    setDialog("add");
  }

  function openEdit(g: Goal) {
    setForm(goalToForm(g));
    setTarget(g);
    setDialog("edit");
  }

  function openDeposit(g: Goal) {
    setDepositAmount("");
    setTarget(g);
    setDialog("deposit");
  }

  function openDelete(g: Goal) {
    setTarget(g);
    setDialog("delete");
  }

  function close() { setDialog(null); setTarget(null); }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    const tgt = parseFloat(form.target.replace(",", "."));
    const cur = parseFloat(form.current.replace(",", ".") || "0");
    if (!form.name.trim() || isNaN(tgt) || tgt <= 0 || !form.deadline) return;
    setSaving(true);
    const isDone = cur >= tgt;
    try {
      if (dialog === "add") {
        await addGoal({
          name: form.name.trim(),
          target: tgt,
          current: cur,
          deadline: form.deadline,
          icon: form.icon,
          status: isDone ? "completed" : "active",
        });
      } else if (dialog === "edit" && target) {
        await updateGoal(target.id, {
          name: form.name.trim(),
          target: tgt,
          current: cur,
          deadline: form.deadline,
          icon: form.icon,
          status: isDone ? "completed" : target.status === "archived" ? "archived" : "active",
        });
      }
      close();
    } finally { setSaving(false); }
  }

  async function handleDeposit() {
    if (!target) return;
    const val = parseFloat(depositAmount.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    try {
      const newCurrent = target.current + val;
      await updateGoal(target.id, {
        current: newCurrent,
        status: newCurrent >= target.target ? "completed" : target.status,
      });
      close();
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!target) return;
    setSaving(true);
    try { await deleteGoal(target.id); close(); }
    finally { setSaving(false); }
  }

  async function handleToggleArchive(g: Goal) {
    await updateGoal(g.id, {
      status: g.status === "archived" ? "active" : "archived",
    });
  }

  // ── Summary stats ─────────────────────────────────────────────────────────

  const active = goals.filter((g) => g.status === "active");
  const totalTarget = active.reduce((s, g) => s + g.target, 0);
  const totalSaved = active.reduce((s, g) => s + g.current, 0);

  // ── Patrimônio ────────────────────────────────────────────────────────────

  const patrimonio = useMemo(() => {
    const caixa = transactions.reduce((s, t) => s + t.amount, 0);
    const investido = investments
      .filter((inv) => inv.status === "active")
      .reduce((s, inv) => {
        const extra = investmentMoves
          .filter((m) => m.investmentId === inv.id)
          .reduce((ms, m) => (m.type === "aporte" ? ms + m.amount : ms - m.amount), 0);
        return s + inv.initialAmount + extra;
      }, 0);
    return caixa + investido;
  }, [transactions, investments, investmentMoves]);

  const totalAlocado = useMemo(
    () => goals.filter((g) => g.status !== "archived").reduce((s, g) => s + g.current, 0),
    [goals],
  );

  const livre = patrimonio - totalAlocado;
  const pctAlocado = patrimonio > 0 ? Math.min(totalAlocado / patrimonio, 1) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Metas"
        subtitle="Acompanhe suas reservas, viagens e objetivos financeiros."
        actions={
          <button
            onClick={openAdd}
            className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"
          >
            <Plus className="size-4" /> Nova meta
          </button>
        }
      />

      {/* Patrimônio panel */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Patrimônio total</div>
            <div className="num text-2xl font-semibold mt-0.5">{brl(patrimonio)}</div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">Caixa + investimentos ativos</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Livre para distribuir</div>
            <div className={`num text-xl font-semibold mt-0.5 ${livre >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]"}`}>
              {brl(livre)}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">{brl(totalAlocado)} alocado</div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${(pctAlocado * 100).toFixed(1)}%` }}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            {(pctAlocado * 100).toFixed(1)}% do patrimônio alocado em metas
          </div>
        </div>
      </div>

      {/* Stats */}
      {active.length > 0 && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Metas ativas</div>
            <div className="text-2xl font-semibold mt-1">{active.length}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total guardado</div>
            <div className="num text-2xl font-semibold mt-1">{brl(totalSaved)}</div>
          </div>
          <div className="glass rounded-2xl p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Total a atingir</div>
            <div className="num text-2xl font-semibold mt-1">{brl(totalTarget)}</div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {goals.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "active", "completed", "archived"] as FilterTab[]).map((tab) => (
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

      {/* Goals grid */}
      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((g) => {
            const p = g.target > 0 ? g.current / g.target : 0;
            const remaining = Math.max(g.target - g.current, 0);
            const msLeft = +new Date(g.deadline) - Date.now();
            const monthsLeft = Math.max(1, Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 30)));
            const monthly = remaining / monthsLeft;
            const isOverdue = msLeft < 0 && g.status === "active";

            return (
              <GlassCard key={g.id} className={`relative overflow-hidden ${g.status === "archived" ? "opacity-60" : ""}`}>
                <div className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
                <div className="flex items-start justify-between mb-4">
                  <div className="size-12 rounded-2xl glass-soft grid place-items-center text-2xl">
                    {g.icon}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {g.status === "completed" ? (
                      <Pill tone="positive"><Check className="size-3 inline" /> Concluida</Pill>
                    ) : g.status === "archived" ? (
                      <Pill tone="neutral">Arquivada</Pill>
                    ) : isOverdue ? (
                      <Pill tone="negative">Atrasada</Pill>
                    ) : monthsLeft <= 3 ? (
                      <Pill tone="warning">Prazo curto</Pill>
                    ) : (
                      <Pill tone="info">Ativa</Pill>
                    )}
                    <GoalMenu
                      goal={g}
                      onEdit={() => openEdit(g)}
                      onDeposit={() => openDeposit(g)}
                      onToggleArchive={() => handleToggleArchive(g)}
                      onDelete={() => openDelete(g)}
                    />
                  </div>
                </div>

                <div className="text-[15px] font-semibold">{g.name}</div>
                <div className="text-[11.5px] text-muted-foreground mt-0.5">
                  Prazo: {dateBR(g.deadline)}
                </div>

                <div className="mt-4">
                  <div className="flex items-end justify-between mb-1.5">
                    <div className="num text-2xl font-semibold">{brl(g.current)}</div>
                    <div className="text-[11px] text-muted-foreground num">de {brl(g.target)}</div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary via-chart-3 to-chart-2 transition-all"
                      style={{ width: `${Math.min(p * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-[11.5px] text-muted-foreground mt-1.5">
                    {Math.round(p * 100)}% concluido
                  </div>
                </div>

                {g.status !== "archived" && g.status !== "completed" && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="glass-soft rounded-xl p-3">
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Restante</div>
                      <div className="num text-[13.5px] font-semibold mt-0.5">{brl(remaining)}</div>
                    </div>
                    <div className="glass-soft rounded-xl p-3">
                      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground">Aporte ideal</div>
                      <div className="num text-[13.5px] font-semibold mt-0.5">{brl(monthly)}/mes</div>
                    </div>
                  </div>
                )}

                {g.status === "active" && (
                  <button
                    onClick={() => openDeposit(g)}
                    className="mt-3 w-full h-9 rounded-xl text-[13px] glass-soft hover:bg-accent/40 flex items-center justify-center gap-1.5 transition"
                  >
                    <PiggyBank className="size-4" /> Registrar aporte
                  </button>
                )}
              </GlassCard>
            );
          })}
        </div>
      ) : (
        <GlassCard>
          <p className="text-[13px] text-muted-foreground text-center py-8">
            {goals.length === 0
              ? "Nenhuma meta criada ainda. Clique em Nova meta para comecar."
              : "Nenhuma meta nesta categoria."}
          </p>
        </GlassCard>
      )}

      {/* ── Add / Edit modal ───────────────────────────────────────────────── */}
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
                {dialog === "add" ? "Nova meta" : "Editar meta"}
              </h2>
              <button title="Fechar" onClick={close} className="size-7 rounded-full hover:bg-accent/40 grid place-items-center transition">
                <X className="size-4" />
              </button>
            </div>

            <Field label="Nome">
              <input
                type="text"
                placeholder="Ex: Viagem para Europa"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={inputCls}
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor alvo (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.target}
                  onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                  className={inputCls}
                />
              </Field>
              <Field label="Ja guardei (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={form.current}
                  onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="Prazo">
              <DatePickerField
                value={form.deadline}
                onChange={(v) => setForm((f) => ({ ...f, deadline: v }))}
              />
            </Field>

            <Field label="Icone">
              <div className="grid grid-cols-10 gap-1">
                {ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                    className={`size-9 rounded-lg text-lg grid place-items-center transition ${
                      form.icon === ic
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "glass-soft hover:bg-accent/40"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </Field>

            <div className="flex gap-2 pt-1">
              <button onClick={close} className="flex-1 h-10 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.target || !form.deadline}
                className="flex-1 h-10 rounded-xl text-[13px] bg-primary text-primary-foreground transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deposit modal ─────────────────────────────────────────────────── */}
      {dialog === "deposit" && target && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Registrar aporte</h2>
              <button title="Fechar" onClick={close} className="size-7 rounded-full hover:bg-accent/40 grid place-items-center transition">
                <X className="size-4" />
              </button>
            </div>

            <div className="glass-soft rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">{target.icon}</span>
              <div>
                <div className="text-[14px] font-medium">{target.name}</div>
                <div className="text-[11.5px] text-muted-foreground num">
                  {brl(target.current)} de {brl(target.target)}
                </div>
              </div>
            </div>

            <Field label="Valor do aporte (R$)">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDeposit()}
                className={inputCls}
                autoFocus
              />
            </Field>

            <div className="flex gap-2 pt-1">
              <button onClick={close} className="flex-1 h-10 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition">
                Cancelar
              </button>
              <button
                onClick={handleDeposit}
                disabled={saving || !depositAmount}
                className="flex-1 h-10 rounded-xl text-[13px] bg-primary text-primary-foreground transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete modal ─────────────────────────────────────────────────── */}
      {dialog === "delete" && target && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">Excluir meta</h2>
            <p className="text-[13px] text-muted-foreground">
              Tem a certeza que quer excluir{" "}
              <span className="font-medium text-foreground">
                {target.icon} {target.name}
              </span>
              ? Esta acao nao pode ser desfeita.
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
