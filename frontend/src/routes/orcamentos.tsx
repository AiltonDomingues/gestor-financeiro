import { createFileRoute } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, Stat, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { usePeriod } from "@/state/period-context";
import { computeCategorySpend, filterByMonth } from "@/lib/selectors";
import { brl } from "@/lib/format";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/orcamentos")({
  head: () => ({ meta: [{ title: "Orçamentos • GS" }] }),
  component: Orcamentos,
});

type DialogMode = "set" | "remove" | null;

const inputCls =
  "w-full glass-soft rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 bg-transparent";

function Orcamentos() {
  const { transactions, categories, updateCategory } = useAppData();
  const { period } = usePeriod();

  const monthTxs = useMemo(
    () => filterByMonth(transactions, period.year, period.month),
    [transactions, period],
  );
  const categorySpend = useMemo(
    () => computeCategorySpend(monthTxs, categories),
    [monthTxs, categories],
  );

  const budgeted = categorySpend.filter((c) => c.budget != null && c.budget > 0);
  const unbudgeted = categorySpend.filter((c) => !c.budget);

  const totalBudget = budgeted.reduce((s, c) => s + (c.budget ?? 0), 0);
  const totalSpent = budgeted.reduce((s, c) => s + c.spent, 0);
  const pct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [targetId, setTargetId] = useState("");
  const [amount, setAmount] = useState("");
  const [saving, setSaving] = useState(false);

  function openSet(categoryId: string, current?: number) {
    setTargetId(categoryId);
    setAmount(current != null ? String(current) : "");
    setDialog("set");
  }

  function openAdd() {
    const first = unbudgeted[0] ?? budgeted[0];
    if (!first) return;
    setTargetId(first.id);
    setAmount("");
    setDialog("set");
  }

  function openRemove(categoryId: string) {
    setTargetId(categoryId);
    setDialog("remove");
  }

  function close() { setDialog(null); }

  async function handleSave() {
    const val = parseFloat(amount.replace(",", "."));
    if (isNaN(val) || val <= 0) return;
    setSaving(true);
    try {
      await updateCategory(targetId, { budget: val });
      close();
    } finally { setSaving(false); }
  }

  async function handleRemove() {
    setSaving(true);
    try {
      await updateCategory(targetId, { budget: undefined });
      close();
    } finally { setSaving(false); }
  }

  const targetCat = categories.find((c) => c.id === targetId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orcamentos"
        subtitle="Defina limites por categoria e acompanhe o consumo do mes."
        actions={
          <button
            onClick={openAdd}
            disabled={categories.length === 0}
            className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5 disabled:opacity-50"
          >
            <Plus className="size-4" /> Novo orcamento
          </button>
        }
      />

      {/* Summary stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Orcamento total" value={brl(totalBudget)} hint="Soma dos limites definidos" />
        <Stat
          label="Consumido"
          value={brl(totalSpent)}
          delta={totalBudget > 0 ? `${pct.toFixed(0)}%` : undefined}
          accent={pct > 90 ? "negative" : pct > 70 ? "warning" : "default"}
        />
        <Stat
          label="Disponivel"
          value={brl(Math.max(totalBudget - totalSpent, 0))}
          accent="positive"
          hint="Restante ate o fim do mes"
        />
      </div>

      {/* Budgeted categories */}
      {budgeted.length > 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle title="Com limite definido" hint={`${budgeted.length} ${budgeted.length === 1 ? "categoria" : "categorias"}`} />
          </div>
          <div className="divide-y divide-glass-border">
            {budgeted.map((c) => {
              const p = (c.spent / c.budget!) * 100;
              const tone =
                p > 100 ? "negative" : p > 80 ? "warning" : p > 60 ? "info" : "positive";
              return (
                <div key={c.id} className="px-5 py-4 hover:bg-accent/20 transition group">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="size-9 rounded-xl grid place-items-center text-lg"
                        style={{ background: `${c.color}22` }}
                      >
                        {c.icon}
                      </div>
                      <div>
                        <div className="text-[14px] font-medium">{c.name}</div>
                        <div className="text-[11.5px] text-muted-foreground">
                          {c.count} {c.count === 1 ? "transacao" : "transacoes"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="num text-[14px] font-semibold">
                          {brl(c.spent)}{" "}
                          <span className="text-muted-foreground text-[11px] font-normal">
                            / {brl(c.budget!)}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {p > 100
                            ? `Excedido em ${brl(c.spent - c.budget!)}`
                            : `Restam ${brl(c.budget! - c.spent)}`}
                        </div>
                      </div>
                      <Pill tone={tone}>{Math.round(p)}%</Pill>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
                        <button
                          title="Editar limite"
                          onClick={() => openSet(c.id, c.budget)}
                          className="size-7 rounded-lg hover:bg-accent/50 grid place-items-center transition"
                        >
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </button>
                        <button
                          title="Remover limite"
                          onClick={() => openRemove(c.id)}
                          className="size-7 rounded-lg hover:bg-accent/50 grid place-items-center transition"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </button>
                      </div>
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
      )}

      {/* Unbudgeted categories */}
      {unbudgeted.length > 0 && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle
              title="Sem limite"
              hint={`${unbudgeted.length} ${unbudgeted.length === 1 ? "categoria" : "categorias"} sem orcamento`}
            />
          </div>
          <div className="divide-y divide-glass-border">
            {unbudgeted.map((c) => (
              <div
                key={c.id}
                className="px-5 py-3.5 flex items-center justify-between hover:bg-accent/20 transition"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-9 rounded-xl grid place-items-center text-lg"
                    style={{ background: `${c.color}22` }}
                  >
                    {c.icon}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium">{c.name}</div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {c.spent > 0 ? `${brl(c.spent)} gastos este mes` : "Nenhum gasto este mes"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => openSet(c.id)}
                  className="h-8 px-3 rounded-lg text-[12px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 transition"
                >
                  <Plus className="size-3.5" /> Definir limite
                </button>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty state */}
      {categories.length === 0 && (
        <GlassCard>
          <p className="text-[13px] text-muted-foreground text-center py-8">
            Crie categorias primeiro para definir orcamentos.
          </p>
        </GlassCard>
      )}

      {/* Set / edit budget modal */}
      {dialog === "set" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {targetCat?.budget ? "Editar limite" : "Definir limite"}
              </h2>
              <button
                title="Fechar"
                onClick={close}
                className="size-7 rounded-full hover:bg-accent/40 grid place-items-center transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                Categoria
              </label>
              <CustomSelect
                value={targetId}
                onChange={setTargetId}
                options={categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                Limite mensal (R$)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                className={inputCls}
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={close}
                className="flex-1 h-10 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !amount}
                className="flex-1 h-10 rounded-xl text-[13px] bg-primary text-primary-foreground transition disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove budget modal */}
      {dialog === "remove" && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative w-full sm:max-w-sm glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">Remover limite</h2>
            <p className="text-[13px] text-muted-foreground">
              Tem a certeza que quer remover o limite de{" "}
              <span className="font-medium text-foreground">
                {targetCat?.icon} {targetCat?.name}
              </span>
              ?
            </p>
            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 h-10 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRemove}
                disabled={saving}
                className="flex-1 h-10 rounded-xl text-[13px] bg-[var(--negative)] text-white transition disabled:opacity-50"
              >
                {saving ? "Removendo..." : "Remover"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
