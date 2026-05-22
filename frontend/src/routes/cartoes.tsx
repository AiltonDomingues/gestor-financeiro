import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, CreditCard as CardIcon, Wifi, ArrowUpRight, Pencil, Trash2, X } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl } from "@/lib/format";
import { useState } from "react";
import type { Card, CardBrand } from "@/domain/types";

export const Route = createFileRoute("/cartoes")({
  head: () => ({ meta: [{ title: "Cartões • GS" }] }),
  component: Cartoes,
});

// ── Gradient presets ──────────────────────────────────────────────────────────

const GRADIENTS = [
  { label: "Vermelho",  value: "linear-gradient(135deg, #b91c1c 0%, #7f1d1d 60%, #1f2937 100%)" },
  { label: "Escuro",    value: "linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #334155 100%)" },
  { label: "Roxo",      value: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 60%, #2e1065 100%)" },
  { label: "Azul",      value: "linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 60%, #3b82f6 100%)" },
  { label: "Verde",     value: "linear-gradient(135deg, #14532d 0%, #15803d 60%, #4ade80 100%)" },
  { label: "Grafite",   value: "linear-gradient(135deg, #18181b 0%, #27272a 60%, #52525b 100%)" },
];

const BRANDS: CardBrand[] = ["Visa", "Mastercard", "Elo"];

// ── Form state ────────────────────────────────────────────────────────────────

type FormState = {
  name: string; bank: string; brand: CardBrand; last4: string;
  limit: string; closingDay: string; dueDay: string; gradient: string; primary: boolean;
};

const emptyForm: FormState = {
  name: "", bank: "", brand: "Mastercard", last4: "",
  limit: "", closingDay: "15", dueDay: "22",
  gradient: GRADIENTS[0].value, primary: false,
};

function cardToForm(c: Card): FormState {
  return { name: c.name, bank: c.bank, brand: c.brand, last4: c.last4,
    limit: String(c.limit), closingDay: String(c.closingDay), dueDay: String(c.dueDay),
    gradient: c.gradient, primary: c.primary ?? false };
}

function formToCard(f: FormState): Omit<Card, "id"> {
  return { name: f.name.trim(), bank: f.bank.trim(), brand: f.brand, last4: f.last4.trim(),
    limit: Number(f.limit) || 0, used: 0, closingDay: Number(f.closingDay) || 15,
    dueDay: Number(f.dueDay) || 22, gradient: f.gradient, primary: f.primary || undefined };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}>
      <div className="glass rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border shrink-0">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          <button onClick={onClose} className="size-8 rounded-lg hover:bg-accent/40 grid place-items-center transition">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, maxLength }:
  { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; maxLength?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full glass-soft rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 transition"
      />
    </div>
  );
}

function CardForm({ form, onChange }: { form: FormState; onChange: (f: Partial<FormState>) => void }) {
  return (
    <div className="space-y-4">
      {/* Live preview */}
      <div className="rounded-2xl p-4 relative overflow-hidden flex flex-col justify-between h-28"
        style={{ background: form.gradient }}>
        <div className="absolute -top-6 -right-6 size-24 rounded-full bg-white/10 blur-xl" />
        <div className="flex items-start justify-between text-white">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-70">{form.bank || "Banco"}</div>
            <div className="text-[13px] font-semibold mt-0.5">{form.name || "Nome do cartão"}</div>
          </div>
          <Wifi className="size-4 opacity-70 rotate-90" />
        </div>
        <div className="flex items-end justify-between text-white">
          <div className="text-[11px] tracking-[0.3em] num opacity-80">•••• {form.last4 || "0000"}</div>
          <div className="text-[11px] font-medium opacity-80">{form.brand}</div>
        </div>
      </div>

      {/* Gradient picker */}
      <div className="space-y-1.5">
        <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Cor</label>
        <div className="flex gap-2">
          {GRADIENTS.map((g) => (
            <button key={g.label} title={g.label} onClick={() => onChange({ gradient: g.value })}
              className={`size-8 rounded-lg transition ${form.gradient === g.value ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "opacity-70 hover:opacity-100"}`}
              style={{ background: g.value }} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><Field label="Nome do cartão" value={form.name} onChange={(v) => onChange({ name: v })} placeholder="Ex: Nubank Ultravioleta" /></div>
        <Field label="Banco / Emissor" value={form.bank} onChange={(v) => onChange({ bank: v })} placeholder="Ex: Nubank" />
        <div className="space-y-1.5">
          <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Bandeira</label>
          <CustomSelect
            value={form.brand}
            onChange={(v) => onChange({ brand: v as CardBrand })}
            options={BRANDS.map((b) => ({ value: b, label: b }))}
          />
        </div>
        <Field label="4 últimos dígitos" value={form.last4} onChange={(v) => onChange({ last4: v.replace(/\D/g, "").slice(0, 4) })} placeholder="0000" maxLength={4} />
        <Field label="Limite (R$)" value={form.limit} onChange={(v) => onChange({ limit: v })} type="number" placeholder="5000" />
        <Field label="Dia fechamento" value={form.closingDay} onChange={(v) => onChange({ closingDay: v })} type="number" placeholder="15" />
        <Field label="Dia vencimento" value={form.dueDay} onChange={(v) => onChange({ dueDay: v })} type="number" placeholder="22" />
      </div>

      {/* Primary toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <div className="relative">
          <input type="checkbox" checked={form.primary} onChange={(e) => onChange({ primary: e.target.checked })} className="sr-only peer" title="Cartão principal" />
          <div className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
          <div className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-[13px]">Cartão principal</span>
      </label>
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

// ── Main component ────────────────────────────────────────────────────────────

function Cartoes() {
  const { cards, addCard, updateCard, deleteCard } = useAppData();
  const [dialog, setDialog] = useState<"add" | "edit" | "delete" | null>(null);
  const [target, setTarget] = useState<Card | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm(emptyForm); setTarget(null); setDialog("add"); }
  function openEdit(c: Card) { setForm(cardToForm(c)); setTarget(c); setDialog("edit"); }
  function openDelete(c: Card) { setTarget(c); setDialog("delete"); }
  function close() { setDialog(null); setTarget(null); }

  async function handleSave() {
    if (!form.name.trim() || !form.last4 || form.last4.length < 4) return;
    setSaving(true);
    try {
      if (dialog === "add") {
        await addCard(formToCard(form));
      } else if (dialog === "edit" && target) {
        const { used: _used, ...rest } = formToCard(form);
        await updateCard(target.id, rest);
      }
      close();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!target) return;
    setSaving(true);
    try { await deleteCard(target.id); close(); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cartões"
        subtitle="Gerencie limites, faturas em aberto e tendências de uso."
        actions={
          <button onClick={openAdd} className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90 transition">
            <Plus className="size-4" /> Adicionar cartão
          </button>
        }
      />

      {cards.length === 0 ? (
        <div className="glass rounded-3xl p-16 flex flex-col items-center gap-4 text-center">
          <div className="size-14 rounded-2xl bg-primary/15 grid place-items-center">
            <CardIcon className="size-7 text-primary" />
          </div>
          <div>
            <div className="text-[15px] font-semibold">Nenhum cartão cadastrado</div>
            <p className="text-[13px] text-muted-foreground mt-1">Adicione seus cartões para acompanhar limites e faturas.</p>
          </div>
          <button onClick={openAdd} className="h-9 px-4 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5 hover:opacity-90 transition">
            <Plus className="size-4" /> Adicionar cartão
          </button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {cards.map((c) => {
            const usage = c.limit > 0 ? c.used / c.limit : 0;
            const high = usage > 0.7;
            return (
              <div key={c.id} className="space-y-3">
                {/* Card visual */}
                <div className="rounded-3xl aspect-[1.586/1] p-5 relative overflow-hidden shadow-[0_20px_60px_-25px_rgba(0,0,0,.6)] flex flex-col justify-between group"
                  style={{ background: c.gradient }}>
                  <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
                  <div className="flex items-start justify-between text-white">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider opacity-70">{c.bank}</div>
                      <div className="text-[15px] font-semibold mt-0.5">{c.name}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {c.primary && <Pill tone="warning">Principal</Pill>}
                      <Wifi className="size-5 opacity-70 rotate-90" />
                    </div>
                  </div>
                  <div className="text-white">
                    <div className="text-[12px] tracking-[0.4em] num mb-2 opacity-80">•••• •••• •••• {c.last4}</div>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider opacity-60">Fatura aberta</div>
                        <div className="num text-lg font-semibold">{brl(c.used)}</div>
                      </div>
                      <div className="text-[11px] font-medium opacity-80">{c.brand}</div>
                    </div>
                  </div>

                  {/* Edit / delete overlay buttons */}
                  <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(c)} title="Editar" className="size-7 rounded-lg bg-black/40 backdrop-blur-sm grid place-items-center text-white hover:bg-black/60 transition">
                      <Pencil className="size-3.5" />
                    </button>
                    <button onClick={() => openDelete(c)} title="Excluir" className="size-7 rounded-lg bg-black/40 backdrop-blur-sm grid place-items-center text-white hover:bg-red-600/80 transition">
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
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
                    <div className={`h-full rounded-full transition-all ${high ? "bg-gradient-to-r from-[var(--warning)] to-[var(--negative)]" : "bg-gradient-to-r from-primary to-chart-3"}`}
                      style={{ width: `${Math.min(usage * 100, 100)}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <Item label="Disponível" value={brl(c.limit - c.used)} accent="positive" />
                    <Item label="Uso" value={`${Math.round(usage * 100)}%`} />
                    <Item label="Fechamento" value={`Dia ${c.closingDay}`} />
                    <Item label="Vencimento" value={`Dia ${c.dueDay}`} />
                  </div>
                  <Link to="/faturas" className="w-full mt-4 h-9 rounded-xl glass-soft hover:bg-accent/40 transition text-[13px] font-medium flex items-center justify-center gap-1.5">
                    Ver faturas <ArrowUpRight className="size-3.5" />
                  </Link>
                </GlassCard>
              </div>
            );
          })}

          {/* Add card placeholder */}
          <button onClick={openAdd} className="glass rounded-3xl border-dashed border-2 border-glass-border/70 hover:border-primary/40 transition cursor-pointer p-6 flex items-center justify-center gap-3 text-muted-foreground hover:text-foreground min-h-[160px]">
            <CardIcon className="size-5" />
            <span className="text-[14px] font-medium">Adicionar cartão</span>
          </button>
        </div>
      )}

      {/* ── Add / Edit dialog ──────────────────────────────────────── */}
      {(dialog === "add" || dialog === "edit") && (
        <Modal title={dialog === "add" ? "Novo cartão" : "Editar cartão"} onClose={close}>
          <CardForm form={form} onChange={(p) => setForm((f) => ({ ...f, ...p }))} />
          <div className="flex gap-3 mt-5">
            <button onClick={close} className="flex-1 h-10 rounded-xl glass-soft text-[13px] font-medium hover:bg-accent/40 transition">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving || !form.name.trim() || form.last4.length < 4}
              className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition">
              {saving ? "Salvando…" : dialog === "add" ? "Adicionar" : "Salvar"}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete confirmation ────────────────────────────────────── */}
      {dialog === "delete" && target && (
        <Modal title="Excluir cartão" onClose={close}>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            Tem certeza que quer excluir o cartão <span className="text-foreground font-medium">{target.name}</span>?
            Esta ação não pode ser desfeita.
          </p>
          <div className="flex gap-3 mt-5">
            <button onClick={close} className="flex-1 h-10 rounded-xl glass-soft text-[13px] font-medium hover:bg-accent/40 transition">
              Cancelar
            </button>
            <button onClick={handleDelete} disabled={saving}
              className="flex-1 h-10 rounded-xl bg-[var(--negative)] text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition">
              {saving ? "Excluindo…" : "Excluir"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
