import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, MoreHorizontal, Wand2, X, Pencil, Trash2, ChevronDown,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { usePeriod } from "@/state/period-context";
import { computeCategorySpend, filterByMonth } from "@/lib/selectors";
import { brl, pct } from "@/lib/format";
import type { CategoryRuleMatchType, CategoryType } from "@/domain/types";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/categorias")({
  head: () => ({ meta: [{ title: "Categorias • GS" }] }),
  component: Categorias,
});

const ICON_OPTIONS = [
  "🍔","🛒","🚗","🏠","💊","🎬","✈️","💪","📚","🎮",
  "👕","☕","💰","🎁","🐾","🌿","⚡","📱","🏥","🎵",
  "🏖️","🎓","🍷","🧴","💻","🛠️","🚕","🍕","🎯","🎪",
];

const COLOR_OPTIONS = [
  "#6366f1","#8b5cf6","#ec4899","#ef4444","#f97316",
  "#eab308","#22c55e","#14b8a6","#06b6d4","#3b82f6",
  "#a855f7","#64748b",
];

const MATCH_LABELS: Record<CategoryRuleMatchType, string> = {
  contains: "Contém",
  startsWith: "Começa com",
  exact: "Igual a",
  regex: "Regex",
};

type DialogMode =
  | "add-cat" | "edit-cat" | "delete-cat"
  | "add-rule" | "edit-rule" | "delete-rule"
  | null;

type CatForm = { name: string; icon: string; color: string; budget: string; type: CategoryType; restricted: boolean };
type RuleForm = {
  pattern: string;
  matchType: CategoryRuleMatchType;
  categoryId: string;
  priority: string;
  enabled: boolean;
};

const EMPTY_CAT: CatForm = { name: "", icon: "🏷️", color: "#6366f1", budget: "", type: "expense", restricted: false };
const EMPTY_RULE: RuleForm = {
  pattern: "", matchType: "contains",
  categoryId: "", priority: "10", enabled: true,
};

function Categorias() {
  const {
    transactions, categories, categoryRules,
    addCategory, updateCategory, deleteCategory,
    addCategoryRule, updateCategoryRule, deleteCategoryRule,
  } = useAppData();
  const { period } = usePeriod();

  const monthTx = useMemo(
    () => filterByMonth(transactions, period.year, period.month),
    [transactions, period.year, period.month],
  );
  const categorySpend = useMemo(
    () => computeCategorySpend(monthTx, categories),
    [monthTx, categories],
  );
  const total = categorySpend.reduce((s, c) => s + c.spent, 0);

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [targetId, setTargetId] = useState("");
  const [catForm, setCatForm] = useState<CatForm>(EMPTY_CAT);
  const [ruleForm, setRuleForm] = useState<RuleForm>(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [openMenu, setOpenMenu] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);

  function openAddCat() { setCatForm(EMPTY_CAT); setDialog("add-cat"); }

  function openEditCat(id: string) {
    const c = categories.find((x) => x.id === id);
    if (!c) return;
    setCatForm({
      name: c.name, icon: c.icon, color: c.color,
      budget: c.budget ? String(c.budget) : "",
      type: c.type ?? "expense",
      restricted: c.restricted ?? false,
    });
    setTargetId(id);
    setDialog("edit-cat");
    setOpenMenu("");
  }

  function openDeleteCat(id: string) { setTargetId(id); setDialog("delete-cat"); setOpenMenu(""); }

  function openAddRule() {
    setRuleForm({ ...EMPTY_RULE, categoryId: categories[0]?.id ?? "" });
    setDialog("add-rule");
  }

  function openEditRule(id: string) {
    const r = categoryRules.find((x) => x.id === id);
    if (!r) return;
    setRuleForm({ pattern: r.pattern, matchType: r.matchType, categoryId: r.categoryId, priority: String(r.priority), enabled: r.enabled });
    setTargetId(id);
    setDialog("edit-rule");
  }

  function openDeleteRule(id: string) { setTargetId(id); setDialog("delete-rule"); }
  function closeDialog() { setDialog(null); }

  async function saveCat() {
    if (!catForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: catForm.name.trim(), icon: catForm.icon, color: catForm.color,
        type: catForm.type,
        ...(catForm.restricted && catForm.type === "income" ? { restricted: true } : { restricted: undefined }),
        ...(catForm.budget ? { budget: parseFloat(catForm.budget) } : {}),
      };
      if (dialog === "add-cat") await addCategory(payload);
      else await updateCategory(targetId, payload);
      closeDialog();
    } finally { setSaving(false); }
  }

  async function confirmDeleteCat() {
    setSaving(true);
    try { await deleteCategory(targetId); closeDialog(); } finally { setSaving(false); }
  }

  async function saveRule() {
    if (!ruleForm.pattern.trim() || !ruleForm.categoryId) return;
    setSaving(true);
    try {
      const payload = {
        pattern: ruleForm.pattern.trim(), matchType: ruleForm.matchType,
        categoryId: ruleForm.categoryId, priority: parseInt(ruleForm.priority) || 10,
        enabled: ruleForm.enabled,
      };
      if (dialog === "add-rule") await addCategoryRule(payload);
      else await updateCategoryRule(targetId, payload);
      closeDialog();
    } finally { setSaving(false); }
  }

  async function confirmDeleteRule() {
    setSaving(true);
    try { await deleteCategoryRule(targetId); closeDialog(); } finally { setSaving(false); }
  }

  async function toggleRule(id: string, enabled: boolean) {
    await updateCategoryRule(id, { enabled });
  }

  return (
    <div className="space-y-6" onClick={() => setOpenMenu("")}>
      <PageHeader
        title="Categorias"
        subtitle="Organize seus gastos e crie regras automáticas de categorização."
        actions={
          <>
            <button
              onClick={(e) => { e.stopPropagation(); openAddRule(); }}
              className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5"
            >
              <Wand2 className="size-4" /> Nova regra
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openAddCat(); }}
              className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1.5"
            >
              <Plus className="size-4" /> Nova categoria
            </button>
          </>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">

        <GlassCard className="lg:col-span-2 p-0 overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle
              title="Categorias e gastos"
              hint={`${categorySpend.length} categorias · total ${brl(total)}`}
            />
          </div>
          {categorySpend.length === 0 ? (
            <div className="px-5 pb-6 text-[13px] text-muted-foreground">
              Nenhuma categoria ainda. Crie uma acima.
            </div>
          ) : (
            <div className="divide-y divide-glass-border">
              {categorySpend.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="size-10 rounded-xl grid place-items-center text-lg shrink-0"
                    style={{ background: `${c.color}22` }}
                  >
                    {c.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[14px] font-medium">{c.name}</span>
                      {(c.type ?? "expense") === "income" ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          {c.restricted ? "Benefício" : "Receita"}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--negative)]/10 text-[var(--negative)]">
                          Despesa
                        </span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {c.count} transações{total > 0 ? ` · ${pct(c.spent / total, 1)} do total` : ""}
                    </div>
                  </div>
                  {total > 0 && (
                    <div className="w-32 hidden md:block">
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((c.spent / categorySpend[0].spent) * 100, 100)}%`,
                            background: c.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="num text-[14px] font-semibold w-24 text-right">{brl(c.spent)}</div>
                  {c.budget && (
                    <Pill tone={c.spent > c.budget ? "negative" : c.spent > c.budget * 0.8 ? "warning" : "positive"}>
                      {Math.round((c.spent / c.budget) * 100)}%
                    </Pill>
                  )}
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === c.id ? "" : c.id); }}
                      title="Opções"
                      className="size-7 rounded-lg hover:bg-accent/40 grid place-items-center text-muted-foreground transition"
                    >
                      <MoreHorizontal className="size-4" />
                    </button>
                    {openMenu === c.id && (
                      <div className="absolute right-0 z-20 mt-1 w-36 glass rounded-xl shadow-xl py-1 text-[13px]">
                        <button
                          onClick={() => openEditCat(c.id)}
                          className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2"
                        >
                          <Pencil className="size-3.5" /> Editar
                        </button>
                        <button
                          onClick={() => openDeleteCat(c.id)}
                          className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 text-[var(--negative)]"
                        >
                          <Trash2 className="size-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <SectionTitle
            title="Regras automáticas"
            hint={`${categoryRules.length} regras · aplicadas ao importar`}
          />
          <div className="space-y-2.5 mt-3">
            {categoryRules.length === 0 && (
              <div className="text-[12.5px] text-muted-foreground">
                Nenhuma regra. Adicione acima para categorizar automaticamente.
              </div>
            )}
            {categoryRules.map((r) => {
              const cat = categories.find((c) => c.id === r.categoryId);
              return (
                <div key={r.id} className="glass-soft rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <Pill tone="info">P{r.priority}</Pill>
                    <div className="flex items-center gap-1.5 ml-auto">
                      <button
                        onClick={() => toggleRule(r.id, !r.enabled)}
                        title={r.enabled ? "Desativar" : "Ativar"}
                        className={`size-4 rounded-full transition ${r.enabled ? "bg-[var(--positive)]" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"}`}
                      />
                      <button
                        onClick={() => openEditRule(r.id)}
                        title="Editar regra"
                        className="size-5 rounded hover:bg-accent/40 grid place-items-center text-muted-foreground"
                      >
                        <Pencil className="size-3" />
                      </button>
                      <button
                        onClick={() => openDeleteRule(r.id)}
                        title="Excluir regra"
                        className="size-5 rounded hover:bg-accent/40 grid place-items-center text-[var(--negative)]"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[12px] text-muted-foreground">
                    <span>{MATCH_LABELS[r.matchType]}</span>{" "}
                    <span className="font-medium text-foreground">"{r.pattern}"</span>
                  </div>
                  <div className="text-[12px] mt-0.5">
                    <span className="text-muted-foreground">→</span>{" "}
                    <Pill tone="neutral">{cat?.icon} {cat?.name ?? "Sem categoria"}</Pill>
                  </div>
                </div>
              );
            })}
            <button
              onClick={openAddRule}
              className="w-full glass-soft rounded-xl py-2.5 text-[12.5px] font-medium hover:bg-accent/40 flex items-center justify-center gap-1.5"
            >
              <Plus className="size-3.5" /> Adicionar regra
            </button>
          </div>
        </GlassCard>
      </div>

      {(dialog === "add-cat" || dialog === "edit-cat") && (
        <Modal title={dialog === "add-cat" ? "Nova categoria" : "Editar categoria"} onClose={closeDialog}>
          <Field label="Tipo">
            <div className="flex rounded-xl glass-soft p-1 gap-1">
              {(["expense", "income"] as CategoryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setCatForm((f) => ({ ...f, type: t, restricted: false }))}
                  className={`flex-1 h-8 rounded-lg text-[13px] font-medium transition ${
                    catForm.type === t
                      ? t === "expense"
                        ? "bg-[var(--negative)]/20 text-[var(--negative)]"
                        : "bg-emerald-500/20 text-emerald-400"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "expense" ? "Despesa" : "Receita"}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nome">
            <input
              autoFocus
              value={catForm.name}
              onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Alimentação"
              className="w-full bg-transparent border border-glass-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary/60"
            />
          </Field>
          <Field label="Ícone">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker((v) => !v)}
                className="h-9 px-3 rounded-lg glass-soft hover:bg-accent/40 flex items-center gap-2 text-[13px]"
              >
                <span className="text-lg">{catForm.icon}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </button>
              {showIconPicker && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowIconPicker(false)} />
                  <div className="absolute z-20 mt-1 p-2 glass rounded-xl shadow-xl grid grid-cols-10 gap-1 w-64">
                    {ICON_OPTIONS.map((ic) => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => { setCatForm((f) => ({ ...f, icon: ic })); setShowIconPicker(false); }}
                        className={`text-lg p-1 rounded hover:bg-accent/40 transition ${catForm.icon === ic ? "bg-primary/20" : ""}`}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Field>
          <Field label="Cor">
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setCatForm((f) => ({ ...f, color: col }))}
                  className="size-6 rounded-full transition"
                  style={{ background: col, outline: catForm.color === col ? `2px solid ${col}` : undefined, outlineOffset: "2px" }}
                  title={col}
                />
              ))}
            </div>
          </Field>
          <Field label="Orçamento mensal (opcional)">
            <input
              type="number"
              min="0"
              step="0.01"
              value={catForm.budget}
              onChange={(e) => setCatForm((f) => ({ ...f, budget: e.target.value }))}
              placeholder="R$ 0,00"
              className="w-full bg-transparent border border-glass-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary/60 num"
            />
          </Field>
          {catForm.type === "income" && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={catForm.restricted}
                onChange={(e) => setCatForm((f) => ({ ...f, restricted: e.target.checked }))}
                className="size-4 rounded accent-emerald-500"
              />
              <div>
                <div className="text-[13px] font-medium">Benefício restrito</div>
                <div className="text-[11.5px] text-muted-foreground">
                  Ex: Vale Alimentação / Refeição — não conta como renda livre
                </div>
              </div>
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={closeDialog} className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition">Cancelar</button>
            <button
              onClick={saveCat}
              disabled={saving || !catForm.name.trim()}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Salvando…" : dialog === "add-cat" ? "Criar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {dialog === "delete-cat" && (
        <Modal title="Excluir categoria" onClose={closeDialog}>
          <p className="text-[13px] text-muted-foreground">
            Tem certeza que deseja excluir{" "}
            <span className="font-medium text-foreground">
              {categories.find((c) => c.id === targetId)?.name}
            </span>?
            As transações vinculadas ficam sem categoria.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={closeDialog} className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition">Cancelar</button>
            <button
              onClick={confirmDeleteCat}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-[var(--negative)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Modal>
      )}

      {(dialog === "add-rule" || dialog === "edit-rule") && (
        <Modal title={dialog === "add-rule" ? "Nova regra" : "Editar regra"} onClose={closeDialog}>
          <Field label="Padrão">
            <input
              autoFocus
              value={ruleForm.pattern}
              onChange={(e) => setRuleForm((f) => ({ ...f, pattern: e.target.value }))}
              placeholder="Ex: IFOOD"
              className="w-full bg-transparent border border-glass-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary/60"
            />
          </Field>
          <Field label="Tipo de correspondência">
            <CustomSelect
              value={ruleForm.matchType}
              onChange={(v) => setRuleForm((f) => ({ ...f, matchType: v as CategoryRuleMatchType }))}
              options={(Object.entries(MATCH_LABELS) as [CategoryRuleMatchType, string][]).map(([k, v]) => ({ value: k, label: v }))}
            />
          </Field>
          <Field label="Categoria">
            <CustomSelect
              value={ruleForm.categoryId}
              onChange={(v) => setRuleForm((f) => ({ ...f, categoryId: v }))}
              options={[{ value: "", label: "Selecione uma categoria" }, ...categories.map((c) => ({ value: c.id, label: `${c.icon} ${c.name}` }))]}
            />
          </Field>
          <Field label="Prioridade (menor = primeiro)">
            <input
              type="number"
              min="1"
              max="999"
              title="Prioridade"
              placeholder="10"
              value={ruleForm.priority}
              onChange={(e) => setRuleForm((f) => ({ ...f, priority: e.target.value }))}
              className="w-full bg-transparent border border-glass-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary/60 num"
            />
          </Field>
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ruleForm.enabled}
              onChange={(e) => setRuleForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="size-4 rounded accent-primary"
            />
            Regra ativa
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={closeDialog} className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition">Cancelar</button>
            <button
              onClick={saveRule}
              disabled={saving || !ruleForm.pattern.trim() || !ruleForm.categoryId}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Salvando…" : dialog === "add-rule" ? "Criar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {dialog === "delete-rule" && (
        <Modal title="Excluir regra" onClose={closeDialog}>
          <p className="text-[13px] text-muted-foreground">
            Tem certeza? Transações já categorizadas não serão afetadas.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={closeDialog} className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40 transition">Cancelar</button>
            <button
              onClick={confirmDeleteRule}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-[var(--negative)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-40 transition"
            >
              {saving ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-md glass rounded-t-3xl sm:rounded-3xl p-6 space-y-4"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
