import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, TrendingUp, TrendingDown, Landmark, LineChart as LineIcon,
  Coins, Building2, PiggyBank, X, MoreHorizontal, Pencil, Trash2, Activity,
  ArrowDownLeft, ArrowUpLeft,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, Stat, CustomSelect } from "@/components/ui-bits";
import { brl, dateBR } from "@/lib/format";
import { useAppData } from "@/state/app-data-context";
import { useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import type { Investment, InvestmentType, RateIndexer, EconomicRates, InvestmentMove, Category } from "@/domain/types";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";


export const Route = createFileRoute("/investimentos")({
  head: () => ({
    meta: [
      { title: "Investimentos • GS" },
      { name: "description", content: "Carteira de investimentos consolidada: renda fixa, ações, fundos e cripto." },
    ],
  }),
  component: Investimentos,
});

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_GROUP: Record<InvestmentType, string> = {
  CDB: "Renda Fixa", LCI: "Renda Fixa", LCA: "Renda Fixa", Poupanca: "Renda Fixa",
  "Tesouro Selic": "Tesouro Direto", "Tesouro Prefixado": "Tesouro Direto", "Tesouro IPCA+": "Tesouro Direto",
  Fundo: "Fundos", Acoes: "Ações", FII: "FII", ETF: "ETF", Cripto: "Cripto", Outro: "Outros",
};

const GROUP_COLORS: Record<string, string> = {
  "Renda Fixa":     "oklch(0.72 0.16 255)",
  "Tesouro Direto": "oklch(0.72 0.16 310)",
  "Ações":          "oklch(0.76 0.18 150)",
  "FII":            "oklch(0.76 0.18 60)",
  "ETF":            "oklch(0.76 0.18 200)",
  "Cripto":         "oklch(0.72 0.16 230)",
  "Fundos":         "oklch(0.72 0.16 270)",
  "Outros":         "oklch(0.6 0.04 0)",
};

const TYPE_LABEL: Record<InvestmentType, string> = {
  CDB: "CDB", LCI: "LCI", LCA: "LCA", Poupanca: "Poupança",
  "Tesouro Selic": "Tesouro Selic", "Tesouro Prefixado": "Tesouro Prefixado", "Tesouro IPCA+": "Tesouro IPCA+",
  Fundo: "Fundo", Acoes: "Ações", FII: "FII", ETF: "ETF", Cripto: "Cripto", Outro: "Outro",
};

const INVESTMENT_TYPES: InvestmentType[] = [
  "CDB", "LCI", "LCA", "Tesouro Selic", "Tesouro Prefixado", "Tesouro IPCA+",
  "Poupanca", "Fundo", "Acoes", "FII", "ETF", "Cripto", "Outro",
];

const RATE_INDEXERS: RateIndexer[] = ["CDI", "Selic", "IPCA+", "Prefixado", "Custom"];

const inputCls =
  "w-full glass-soft rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary/50 bg-transparent";

// ── Helpers ───────────────────────────────────────────────────────────────────

function effectiveRate(inv: Investment, rates: EconomicRates): number {
  switch (inv.rateIndexer) {
    case "CDI":      return (inv.rateValue / 100) * rates.cdi;
    case "Selic":    return (inv.rateValue / 100) * rates.selic;
    case "IPCA+":    return rates.ipca + inv.rateValue;
    case "Prefixado": return inv.rateValue;
    case "Custom":   return inv.rateValue;
  }
}

function calcPrincipal(inv: Investment, moves: InvestmentMove[]): number {
  const extra = moves
    .filter((m) => m.investmentId === inv.id)
    .reduce((s, m) => (m.type === "aporte" ? s + m.amount : s - m.amount), 0);
  return inv.initialAmount + extra;
}

function calcCurrentValue(inv: Investment, moves: InvestmentMove[], rates: EconomicRates): number {
  const principal = calcPrincipal(inv, moves);
  const rate = effectiveRate(inv, rates) / 100;
  const start = new Date(inv.startDate + "T12:00:00");
  const years = Math.max(0, (Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
  return principal * Math.pow(1 + rate, years);
}

function rateLabel(inv: Investment): string {
  switch (inv.rateIndexer) {
    case "CDI":      return `${inv.rateValue}% CDI`;
    case "Selic":    return `${inv.rateValue}% Selic`;
    case "IPCA+":    return `IPCA+${inv.rateValue}%`;
    case "Prefixado": return `${inv.rateValue}% a.a.`;
    case "Custom":   return `${inv.rateValue}% a.a.`;
  }
}

function rateHint(indexer: RateIndexer): string {
  switch (indexer) {
    case "CDI":      return "Ex: 100 = 100% do CDI, 110 = 110% CDI";
    case "Selic":    return "Ex: 100 = 100% da Selic";
    case "IPCA+":    return "Ex: 5 = IPCA + 5% a.a. de spread";
    case "Prefixado": return "Ex: 13.5 = 13,5% a.a. fixo";
    case "Custom":   return "Taxa anual percentual personalizada";
  }
}

function typeIcon(type: InvestmentType) {
  const g = TYPE_GROUP[type];
  if (g === "Ações" || g === "ETF") return LineIcon;
  if (g === "FII") return Building2;
  if (g === "Cripto") return Coins;
  if (g === "Fundos") return PiggyBank;
  return Landmark;
}

function typeTone(type: InvestmentType) {
  const g = TYPE_GROUP[type];
  if (g === "Renda Fixa" || g === "Tesouro Direto") return "info" as const;
  if (g === "Ações") return "positive" as const;
  if (g === "FII") return "warning" as const;
  if (g === "Cripto") return "negative" as const;
  return "neutral" as const;
}

function buildEvolution(investments: Investment[], moves: InvestmentMove[], rates: EconomicRates) {
  const today = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1);
    const label = d
      .toLocaleDateString("pt-BR", { month: "short" })
      .replace(".", "")
      .replace(/^\w/, (c) => c.toUpperCase());
    let total = 0;
    for (const inv of investments) {
      if (inv.status === "redeemed") continue;
      const start = new Date(inv.startDate + "T00:00:00");
      if (start > d) continue;
      const myMoves = moves.filter((m) => m.investmentId === inv.id && new Date(m.date) <= d);
      const extra = myMoves.reduce((s, m) => (m.type === "aporte" ? s + m.amount : s - m.amount), 0);
      const principal = inv.initialAmount + extra;
      const rate = effectiveRate(inv, rates) / 100;
      const years = Math.max(0, (d.getTime() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
      total += principal * Math.pow(1 + rate, years);
    }
    return { m: label, v: total };
  });
}

// ── Type category helpers ─────────────────────────────────────────────────────

type InvCategory = "fixed" | "treasury" | "variable" | "crypto" | "fund" | "other";

function invCategory(type: InvestmentType): InvCategory {
  if (type === "CDB" || type === "LCI" || type === "LCA" || type === "Poupanca") return "fixed";
  if (type === "Tesouro Selic" || type === "Tesouro Prefixado" || type === "Tesouro IPCA+") return "treasury";
  if (type === "Acoes" || type === "FII" || type === "ETF") return "variable";
  if (type === "Cripto") return "crypto";
  if (type === "Fundo") return "fund";
  return "other";
}

function defaultRateIndexer(type: InvestmentType): RateIndexer {
  if (type === "Tesouro Selic" || type === "Poupanca") return "Selic";
  if (type === "Tesouro Prefixado") return "Prefixado";
  if (type === "Tesouro IPCA+") return "IPCA+";
  if (type === "Acoes" || type === "FII" || type === "ETF" || type === "Cripto" || type === "Fundo") return "Custom";
  return "CDI";
}

function defaultRateValue(type: InvestmentType): string {
  if (type === "Poupanca") return "70";
  if (type === "Tesouro Selic") return "100";
  if (type === "Tesouro Prefixado") return "13.5";
  if (type === "Tesouro IPCA+") return "6";
  if (type === "Acoes" || type === "FII" || type === "ETF" || type === "Cripto" || type === "Fundo") return "0";
  return "100";
}

// ── Form ──────────────────────────────────────────────────────────────────────

type InvForm = {
  name: string;
  institution: string;
  type: InvestmentType;
  rateIndexer: RateIndexer;
  rateValue: string;
  initialAmount: string;
  quantity: string;   // shares / cotas / units (variable types)
  avgPrice: string;   // price per unit — computes initialAmount for variable types
  startDate: string;
  maturityDate: string;
  notes: string;
};

const emptyInvForm = (): InvForm => ({
  name: "",
  institution: "",
  type: "CDB",
  rateIndexer: "CDI",
  rateValue: "100",
  initialAmount: "",
  quantity: "",
  avgPrice: "",
  startDate: new Date().toISOString().slice(0, 10),
  maturityDate: "",
  notes: "",
});

function invToForm(inv: Investment): InvForm {
  const cat = invCategory(inv.type);
  const isVar = cat === "variable" || cat === "crypto" || cat === "fund";
  const qty = inv.quantity ?? 0;
  return {
    name: inv.name,
    institution: inv.institution,
    type: inv.type,
    rateIndexer: inv.rateIndexer,
    rateValue: String(inv.rateValue),
    initialAmount: isVar ? "" : String(inv.initialAmount),
    quantity: qty > 0 ? String(qty) : "",
    avgPrice: qty > 0 ? String(+(inv.initialAmount / qty).toFixed(6)) : "",
    startDate: inv.startDate.slice(0, 10),
    maturityDate: inv.maturityDate?.slice(0, 10) ?? "",
    notes: inv.notes ?? "",
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

// ── Rates Modal ───────────────────────────────────────────────────────────────

function RatesModal({
  rates,
  onSave,
  onClose,
}: {
  rates: EconomicRates;
  onSave: (r: EconomicRates) => Promise<void>;
  onClose: () => void;
}) {
  const [selic, setSelic] = useState(String(rates.selic));
  const [cdi, setCdi] = useState(String(rates.cdi));
  const [ipca, setIpca] = useState(String(rates.ipca));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const s = parseFloat(selic.replace(",", "."));
    const c = parseFloat(cdi.replace(",", "."));
    const ip = parseFloat(ipca.replace(",", "."));
    if (isNaN(s) || isNaN(c) || isNaN(ip)) return;
    setSaving(true);
    try {
      await onSave({ selic: s, cdi: c, ipca: ip, updatedAt: new Date().toISOString() });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Taxas de referência</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Usadas para calcular rendimento estimado
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-xl glass-soft hover:bg-accent/40 grid place-items-center transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Selic (% a.a.)">
            <input
              type="number" step="0.01" min="0"
              value={selic} onChange={(e) => setSelic(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="CDI (% a.a.)">
            <input
              type="number" step="0.01" min="0"
              value={cdi} onChange={(e) => setCdi(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="IPCA (% últimos 12 meses)">
            <input
              type="number" step="0.01" min="0"
              value={ipca} onChange={(e) => setIpca(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="glass-soft rounded-xl p-3 text-[11.5px] text-muted-foreground space-y-1">
          <p className="font-medium text-foreground/70 mb-1.5">Como são aplicadas</p>
          <p>• CDI → CDB, LCI, LCA, Poupança indexados ao CDI</p>
          <p>• Selic → Tesouro Selic</p>
          <p>• IPCA → Tesouro IPCA+ (IPCA + spread do ativo)</p>
          <p>• Prefixado / Custom → taxa definida no cadastro do ativo</p>
        </div>

        {rates.updatedAt && (
          <p className="text-[11px] text-muted-foreground">
            Última atualização: {new Date(rates.updatedAt).toLocaleDateString("pt-BR")}
          </p>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-xl glass-soft hover:bg-accent/40 text-[13px] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-[13px] disabled:opacity-50 transition"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Investment Modal ──────────────────────────────────────────────────────────

function InvestmentModal({
  initial,
  isEdit,
  onSave,
  onClose,
}: {
  initial: InvForm;
  isEdit: boolean;
  onSave: (f: InvForm) => Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InvForm>(initial);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof InvForm, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // When type changes reset rate/amount fields to sensible defaults
  function handleTypeChange(t: string) {
    const type = t as InvestmentType;
    setForm((p) => ({
      ...p,
      type,
      rateIndexer: defaultRateIndexer(type),
      rateValue: defaultRateValue(type),
      quantity: "",
      avgPrice: "",
      initialAmount: "",
    }));
  }

  const cat = invCategory(form.type);
  const isVar = cat === "variable" || cat === "crypto" || cat === "fund";
  const isFixed = cat === "fixed";
  const isTreasury = cat === "treasury";
  const isOther = cat === "other";

  const computedTotal = useMemo(() => {
    if (!isVar) return null;
    const q = parseFloat(form.quantity.replace(",", "."));
    const p = parseFloat(form.avgPrice.replace(",", "."));
    return q > 0 && p > 0 ? q * p : null;
  }, [isVar, form.quantity, form.avgPrice]);

  const valid = (() => {
    if (!form.name.trim() || !form.institution.trim() || !form.startDate) return false;
    if (isVar) {
      const q = parseFloat(form.quantity.replace(",", "."));
      const p = parseFloat(form.avgPrice.replace(",", "."));
      return q > 0 && p > 0;
    }
    return parseFloat(form.initialAmount.replace(",", ".")) > 0;
  })();

  const namePlaceholder: Record<InvCategory, string> = {
    fixed: "Ex: CDB Itaú 110% CDI",
    treasury: "Ex: Tesouro IPCA+ 2035",
    variable: "Ex: ITUB4",
    crypto: "Ex: Bitcoin (BTC)",
    fund: "Ex: Fundo Verde FIC",
    other: "Nome do investimento",
  };
  const institutionPlaceholder: Record<InvCategory, string> = {
    fixed: "Banco ou corretora…",
    treasury: "Corretora…",
    variable: "Corretora…",
    crypto: "Exchange ou carteira…",
    fund: "Gestora / corretora…",
    other: "Instituição…",
  };
  const treasuryIndexerLabel: Partial<Record<InvestmentType, string>> = {
    "Tesouro Selic": "Selic",
    "Tesouro Prefixado": "Prefixado",
    "Tesouro IPCA+": "IPCA+",
  };
  const treasuryRateLabel: Partial<Record<InvestmentType, string>> = {
    "Tesouro Selic": "Taxa (% do Selic)",
    "Tesouro Prefixado": "Taxa (% a.a.)",
    "Tesouro IPCA+": "Spread sobre IPCA (% a.a.)",
  };
  const qtyLabel = cat === "fund" ? "Quantidade de cotas" : cat === "crypto" ? "Quantidade" : "Quantidade (unidades)";
  const priceLabel = cat === "fund" ? "Valor por cota (R$)" : cat === "crypto" ? "Preço médio de compra (R$)" : "Preço médio unitário (R$)";
  const rateSuffix = form.rateIndexer === "CDI" || form.rateIndexer === "Selic" ? "(%)" : "(% a.a.)";

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    try { await onSave(form); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">
            {isEdit ? "Editar investimento" : "Novo investimento"}
          </h2>
          <button
            onClick={onClose}
            className="size-8 rounded-xl glass-soft hover:bg-accent/40 grid place-items-center transition"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">

          {/* Type — always first, full width */}
          <div className="col-span-2">
            <Field label="Tipo de investimento">
              <CustomSelect
                value={form.type}
                onChange={handleTypeChange}
                options={INVESTMENT_TYPES.map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
              />
            </Field>
          </div>

          {/* Name */}
          <div className="col-span-2">
            <Field label={cat === "variable" || cat === "crypto" ? "Ticker / Nome" : "Nome"}>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder={namePlaceholder[cat]}
                className={inputCls}
              />
            </Field>
          </div>

          {/* Institution */}
          <div className="col-span-2">
            <Field label="Instituição">
              <input
                value={form.institution}
                onChange={(e) => set("institution", e.target.value)}
                placeholder={institutionPlaceholder[cat]}
                className={inputCls}
              />
            </Field>
          </div>

          {/* ── Renda fixa (CDB / LCI / LCA) — indexer + rate ── */}
          {isFixed && form.type !== "Poupanca" && (
            <Field label="Indexador">
              <CustomSelect
                value={form.rateIndexer}
                onChange={(v) => set("rateIndexer", v as RateIndexer)}
                options={RATE_INDEXERS.filter((r) => r !== "Selic").map((r) => ({ value: r, label: r }))}
              />
            </Field>
          )}
          {isFixed && (
            <Field label={form.type === "Poupanca" ? "Rendimento (% da Selic)" : `Taxa ${rateSuffix}`}>
              <input
                type="number" step="0.01" min="0"
                value={form.rateValue}
                onChange={(e) => set("rateValue", e.target.value)}
                className={inputCls}
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.type === "Poupanca" ? "Poupança rende ~70% da Selic quando Selic > 8,5% a.a." : rateHint(form.rateIndexer)}
              </p>
            </Field>
          )}

          {/* ── Tesouro Direto — indexer read-only + rate ── */}
          {isTreasury && (
            <>
              <Field label="Indexador">
                <div className={cn(inputCls, "opacity-60 cursor-default text-muted-foreground")}>
                  {treasuryIndexerLabel[form.type]}
                </div>
              </Field>
              <Field label={treasuryRateLabel[form.type] ?? "Taxa"}>
                <input
                  type="number" step="0.01" min="0"
                  value={form.rateValue}
                  onChange={(e) => set("rateValue", e.target.value)}
                  className={inputCls}
                />
              </Field>
            </>
          )}

          {/* ── Outro — all rate fields ── */}
          {isOther && (
            <>
              <Field label="Indexador">
                <CustomSelect
                  value={form.rateIndexer}
                  onChange={(v) => set("rateIndexer", v as RateIndexer)}
                  options={RATE_INDEXERS.map((r) => ({ value: r, label: r }))}
                />
              </Field>
              <Field label={`Taxa ${rateSuffix}`}>
                <input
                  type="number" step="0.01" min="0"
                  value={form.rateValue}
                  onChange={(e) => set("rateValue", e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">{rateHint(form.rateIndexer)}</p>
              </Field>
            </>
          )}

          {/* ── Renda variável / Cripto / Fundo — quantidade + preço médio ── */}
          {isVar && (
            <>
              <Field label={qtyLabel}>
                <input
                  type="number" step="any" min="0"
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="0"
                  className={inputCls}
                />
              </Field>
              <Field label={priceLabel}>
                <input
                  type="number" step="0.01" min="0"
                  value={form.avgPrice}
                  onChange={(e) => set("avgPrice", e.target.value)}
                  placeholder="0,00"
                  className={inputCls}
                />
              </Field>
              {computedTotal !== null && (
                <div className="col-span-2 glass-soft rounded-xl px-3 py-2.5 text-[12.5px] flex items-center justify-between">
                  <span className="text-muted-foreground">Total investido</span>
                  <span className="font-semibold">{brl(computedTotal)}</span>
                </div>
              )}
            </>
          )}

          {/* ── Amount — non-variable types ── */}
          {!isVar && (
            <Field label="Valor investido (R$)">
              <input
                type="number" step="0.01" min="0"
                value={form.initialAmount}
                onChange={(e) => set("initialAmount", e.target.value)}
                placeholder="0,00"
                className={inputCls}
              />
            </Field>
          )}

          {/* Start date — always */}
          <Field label="Data de início">
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => set("startDate", e.target.value)}
              className={inputCls}
            />
          </Field>

          {/* Maturity — only for fixed income types */}
          {(isFixed || isTreasury || isOther) && (
            <Field label="Vencimento (opcional)">
              <input
                type="date"
                value={form.maturityDate}
                onChange={(e) => set("maturityDate", e.target.value)}
                className={inputCls}
              />
            </Field>
          )}

          {/* Notes — always */}
          <div className="col-span-2">
            <Field label="Observações (opcional)">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                className={cn(inputCls, "resize-none")}
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 h-9 rounded-xl glass-soft hover:bg-accent/40 text-[13px] transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !valid}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-[13px] disabled:opacity-50 transition"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Row menu ──────────────────────────────────────────────────────────────────

function InvMenu({
  status,
  onEdit,
  onRedeem,
  onMove,
  onDelete,
}: {
  status: "active" | "redeemed";
  onEdit: () => void;
  onRedeem: () => void;
  onMove: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, right: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="size-7 rounded-lg glass-soft hover:bg-accent/40 grid place-items-center transition"
      >
        <MoreHorizontal className="size-3.5" />
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed z-50 glass rounded-xl shadow-xl py-1 min-w-[170px] text-[12.5px]"
            style={{ top: pos.top, right: pos.right }}
          >
            <button
              onClick={() => { onEdit(); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
            >
              <Pencil className="size-3.5" /> Editar
            </button>
            {status === "active" && (
              <button
                onClick={() => { onMove(); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
              >
                <ArrowDownLeft className="size-3.5" /> Aporte / Resgate
              </button>
            )}
            {status === "active" && (
              <button
                onClick={() => { onRedeem(); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-accent/40 flex items-center gap-2 transition"
              >
                <TrendingDown className="size-3.5" /> Marcar como resgatado
              </button>
            )}
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

// ── Move Modal ────────────────────────────────────────────────────────────────

function MoveModal({
  investment,
  categories,
  onSave,
  onClose,
}: {
  investment: Investment;
  categories: Category[];
  onSave: (move: Omit<InvestmentMove, "id">, txCategoryId: string | null) => Promise<void>;
  onClose: () => void;
}) {
  const [type, setType] = useState<"aporte" | "resgate">("aporte");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [syncToTx, setSyncToTx] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [saving, setSaving] = useState(false);

  const txCategories = categories.filter((c) =>
    type === "aporte" ? c.type === "expense" : c.type === "income",
  );

  const valid = parseFloat(amount.replace(",", ".")) > 0 && !!date;

  async function handleSave() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave(
        {
          investmentId: investment.id,
          type,
          amount: parseFloat(amount.replace(",", ".")),
          date,
          notes: notes.trim() || undefined,
        },
        syncToTx ? (categoryId || "") : null,
      );
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold">Aporte / Resgate</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5 truncate max-w-[220px]">{investment.name}</p>
          </div>
          <button onClick={onClose} className="size-8 rounded-xl glass-soft hover:bg-accent/40 grid place-items-center transition">
            <X className="size-4" />
          </button>
        </div>

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setType("aporte")}
            className={cn(
              "h-9 rounded-xl text-[13px] flex items-center justify-center gap-1.5 transition",
              type === "aporte" ? "bg-[var(--positive)]/20 text-[var(--positive)] ring-1 ring-[var(--positive)]/40" : "glass-soft hover:bg-accent/40",
            )}
          >
            <ArrowUpLeft className="size-4" /> Aporte
          </button>
          <button
            onClick={() => setType("resgate")}
            className={cn(
              "h-9 rounded-xl text-[13px] flex items-center justify-center gap-1.5 transition",
              type === "resgate" ? "bg-[var(--negative)]/20 text-[var(--negative)] ring-1 ring-[var(--negative)]/40" : "glass-soft hover:bg-accent/40",
            )}
          >
            <ArrowDownLeft className="size-4" /> Resgate
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Valor (R$)">
            <input
              type="number" step="0.01" min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className={inputCls}
              autoFocus
            />
          </Field>
          <Field label="Data">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Observações (opcional)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: reinvestimento de rendimentos"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Sync to transactions */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={syncToTx}
            onChange={(e) => setSyncToTx(e.target.checked)}
            className="size-4 rounded accent-primary"
          />
          <span className="text-[13px]">
            Lançar também em{" "}
            <span className="font-medium">Transações</span>
          </span>
        </label>

        {syncToTx && (
          <div className="glass-soft rounded-xl p-3 space-y-2.5">
            <p className="text-[11.5px] text-muted-foreground">
              {type === "aporte"
                ? "Cria uma despesa: dinheiro saiu do seu caixa para o investimento."
                : "Cria uma receita: dinheiro voltou do investimento para o seu caixa."}
            </p>
            <Field label="Categoria (opcional)">
              <CustomSelect
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { value: "", label: "Sem categoria" },
                  ...txCategories.map((c) => ({ value: c.id, label: `${c.icon ?? ""} ${c.name}`.trim() })),
                ]}
              />
            </Field>
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 h-9 rounded-xl glass-soft hover:bg-accent/40 text-[13px] transition">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !valid}
            className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground text-[13px] disabled:opacity-50 transition"
          >
            {saving ? "Salvando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

function Investimentos() {
  const {
    investments,
    investmentMoves,
    categories,
    settings,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    updateSettings,
    addInvestmentMove,
    addTransaction,
  } = useAppData();
  const rates = settings.economicRates;

  type DialogMode = "add" | "edit" | "rates" | "delete" | "move" | null;
  const [dialog, setDialog] = useState<DialogMode>(null);
  const [target, setTarget] = useState<Investment | null>(null);
  const [form, setForm] = useState<InvForm>(emptyInvForm());
  const [filter, setFilter] = useState<"all" | "active" | "redeemed">("all");
  const [saving, setSaving] = useState(false);

  function openAdd() { setForm(emptyInvForm()); setDialog("add"); }
  function openEdit(inv: Investment) { setTarget(inv); setForm(invToForm(inv)); setDialog("edit"); }
  function openDelete(inv: Investment) { setTarget(inv); setDialog("delete"); }
  function openMove(inv: Investment) { setTarget(inv); setDialog("move"); }
  function close() { setDialog(null); setTarget(null); }

  async function handleSaveInvestment(f: InvForm) {
    const cat = invCategory(f.type);
    const isVar = cat === "variable" || cat === "crypto" || cat === "fund";
    const rateV = parseFloat(f.rateValue.replace(",", ".")) || 0;
    let amount: number;
    let qty: number | undefined;
    if (isVar) {
      const q = parseFloat(f.quantity.replace(",", "."));
      const p = parseFloat(f.avgPrice.replace(",", "."));
      amount = q * p;
      qty = q;
    } else {
      amount = parseFloat(f.initialAmount.replace(",", "."));
    }
    const payload = {
      name: f.name.trim(),
      institution: f.institution.trim(),
      type: f.type,
      rateIndexer: f.rateIndexer,
      rateValue: rateV,
      initialAmount: amount,
      quantity: qty,
      startDate: f.startDate,
      maturityDate: f.maturityDate || undefined,
      notes: f.notes.trim() || undefined,
      status: "active" as const,
    };
    if (dialog === "add") {
      await addInvestment(payload);
    } else if (dialog === "edit" && target) {
      await updateInvestment(target.id, payload);
    }
  }

  async function handleRedeem(inv: Investment) {
    await updateInvestment(inv.id, { status: "redeemed" });
  }

  async function handleSaveMove(move: Omit<InvestmentMove, "id">, txCategoryId: string | null) {
    await addInvestmentMove(move);
    if (txCategoryId !== null && target) {
      await addTransaction({
        date: move.date,
        merchant: move.type === "aporte" ? `Aporte: ${target.name}` : `Resgate: ${target.name}`,
        description: move.notes ?? "",
        amount: move.type === "aporte" ? -move.amount : move.amount,
        categoryId: txCategoryId,
        origin: "ajuste",
        status: "revisada",
      });
    }
  }

  async function handleDelete() {
    if (!target) return;
    setSaving(true);
    try { await deleteInvestment(target.id); close(); }
    finally { setSaving(false); }
  }

  async function handleSaveRates(r: EconomicRates) {
    await updateSettings({ economicRates: r });
  }

  // ── Filtered ──────────────────────────────────────────────────────────────

  const filtered = useMemo(
    () => investments.filter((inv) => filter === "all" || inv.status === filter),
    [investments, filter],
  );

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = investments.filter((i) => i.status === "active");
    if (active.length === 0) return { total: 0, yield: 0, principal: 0, avgRate: 0, count: 0 };
    let totalPrincipal = 0;
    let totalCurrent = 0;
    for (const inv of active) {
      totalPrincipal += calcPrincipal(inv, investmentMoves);
      totalCurrent += calcCurrentValue(inv, investmentMoves, rates);
    }
    const totalYield = totalCurrent - totalPrincipal;
    const weightedRate = active.reduce((s, inv) => {
      const cur = calcCurrentValue(inv, investmentMoves, rates);
      return s + effectiveRate(inv, rates) * cur;
    }, 0);
    const avgRate = totalCurrent > 0 ? weightedRate / totalCurrent : 0;
    return { total: totalCurrent, yield: totalYield, principal: totalPrincipal, avgRate, count: active.length };
  }, [investments, investmentMoves, rates]);

  // ── Allocation ────────────────────────────────────────────────────────────

  const allocation = useMemo(() => {
    const groups: Record<string, number> = {};
    for (const inv of investments.filter((i) => i.status === "active")) {
      const g = TYPE_GROUP[inv.type];
      groups[g] = (groups[g] ?? 0) + calcCurrentValue(inv, investmentMoves, rates);
    }
    return Object.entries(groups)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: GROUP_COLORS[name] ?? "oklch(0.6 0.04 0)" }));
  }, [investments, investmentMoves, rates]);

  // ── Evolution ─────────────────────────────────────────────────────────────

  const evolution = useMemo(
    () => buildEvolution(investments, investmentMoves, rates),
    [investments, investmentMoves, rates],
  );

  const hasData = investments.length > 0;
  const hasActive = stats.count > 0;
  const yieldPct = stats.principal > 0 ? (stats.yield / stats.principal) * 100 : 0;
  const prevMonthV = evolution[evolution.length - 2]?.v ?? 0;
  const monthGain = evolution[evolution.length - 1].v - prevMonthV;
  const monthPct = prevMonthV > 0 ? (monthGain / prevMonthV) * 100 : 0;
  const sixMonthGain = evolution[evolution.length - 1].v - evolution[0].v;
  const sixMonthPct = evolution[0].v > 0 ? (sixMonthGain / evolution[0].v) * 100 : 0;

  const nextMaturity = useMemo(() => {
    return investments
      .filter((i) => i.status === "active" && i.maturityDate)
      .sort((a, b) => (a.maturityDate! < b.maturityDate! ? -1 : 1))[0] ?? null;
  }, [investments]);

  const bestYield = useMemo(() => {
    const active = investments.filter((i) => i.status === "active");
    if (active.length === 0) return null;
    return active.slice().sort((a, b) => effectiveRate(b, rates) - effectiveRate(a, rates))[0];
  }, [investments, rates]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Investimentos"
        subtitle="Carteira consolidada por classe de ativo, instituição e desempenho."
        actions={
          <>
            <button
              onClick={() => setDialog("rates")}
              className="h-9 px-3 rounded-xl text-[13px] glass-soft hover:bg-accent/40 transition flex items-center gap-1.5"
            >
              <Activity className="size-3.5" /> Revisar taxas
            </button>
            <button
              onClick={openAdd}
              className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"
            >
              <Plus className="size-4" /> Novo ativo
            </button>
          </>
        }
      />

      {hasActive && (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Patrimônio total"
            value={brl(stats.total)}
            hint={`${stats.count} ativo${stats.count > 1 ? "s" : ""}`}
          />
          <Stat
            label="Variação no mês"
            value={brl(monthGain)}
            accent={monthGain >= 0 ? "positive" : "negative"}
            hint={`${monthGain >= 0 ? "+" : ""}${monthPct.toFixed(2)}% no mês`}
          />
          <Stat
            label="Rendimento total"
            value={brl(stats.yield)}
            accent={stats.yield >= 0 ? "positive" : "negative"}
            hint={`${yieldPct >= 0 ? "+" : ""}${yieldPct.toFixed(2)}% acumulado`}
          />
          <Stat
            label="Taxa média"
            value={`${stats.avgRate.toFixed(2)}% a.a.`}
            hint="Ponderada pelo patrimônio"
          />
        </div>
      )}

      {hasActive && (
        <div className="grid lg:grid-cols-3 gap-4">
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <SectionTitle title="Evolução do patrimônio" />
              {sixMonthGain !== 0 && (
                <Pill tone={sixMonthGain >= 0 ? "positive" : "negative"}>
                  <TrendingUp className="size-3" />
                  {sixMonthGain >= 0 ? "+" : ""}{sixMonthPct.toFixed(1)}% / 6m
                </Pill>
              )}
            </div>
            <div className="h-56 -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <defs>
                    <linearGradient id="gInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.72 0.16 255)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="oklch(0.72 0.16 255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                  <XAxis dataKey="m" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="oklch(0.68 0.018 255)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v: number) => brl(v)}
                    labelStyle={{ color: "oklch(0.96 0.005 250)" }}
                  />
                  <Area type="monotone" dataKey="v" stroke="oklch(0.72 0.16 255)" strokeWidth={2} fill="url(#gInv)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <SectionTitle title="Alocação por classe" />
            {allocation.length > 0 ? (
              <>
                <div className="h-44 mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocation} dataKey="value" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="none">
                        {allocation.map((a) => <Cell key={a.name} fill={a.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "oklch(0.18 0.02 260)", border: "1px solid oklch(0.3 0.02 260)", borderRadius: 12, fontSize: 12 }}
                        formatter={(v: number) => brl(v)}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1.5">
                  {allocation.map((a) => (
                    <div key={a.name} className="flex items-center justify-between text-[12.5px]">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full shrink-0" style={{ background: a.color }} />
                        <span className="text-muted-foreground">{a.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {stats.total > 0 ? ((a.value / stats.total) * 100).toFixed(1) : "0.0"}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[12.5px] text-muted-foreground py-10 text-center">Sem alocação</p>
            )}
          </GlassCard>
        </div>
      )}

      {/* Filter tabs */}
      {hasData && (
        <div className="flex gap-1.5">
          {(["all", "active", "redeemed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "h-8 px-3 rounded-full text-[12.5px] transition",
                filter === tab ? "bg-primary text-primary-foreground" : "glass-soft hover:bg-accent/40",
              )}
            >
              {tab === "all" ? "Todos" : tab === "active" ? "Ativos" : "Resgatados"}
            </button>
          ))}
        </div>
      )}

      {/* Positions table */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <SectionTitle title="Posições" />
          <span className="text-[12px] text-muted-foreground">
            {filtered.length} ativo{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
        {filtered.length > 0 ? (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                  <th>Ativo</th>
                  <th className="hidden sm:table-cell">Classe</th>
                  <th className="hidden md:table-cell">Índice / Taxa</th>
                  <th className="hidden md:table-cell">Instituição</th>
                  <th className="text-right hidden sm:table-cell">Principal</th>
                  <th className="text-right">Rendimento</th>
                  <th className="text-right">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => {
                  const Icon = typeIcon(inv.type);
                  const principal = calcPrincipal(inv, investmentMoves);
                  const current = calcCurrentValue(inv, investmentMoves, rates);
                  const yld = current - principal;
                  const yldPct = principal > 0 ? (yld / principal) * 100 : 0;
                  return (
                    <tr
                      key={inv.id}
                      className="border-t border-glass-border hover:bg-accent/20 transition [&>td]:px-3 [&>td]:py-3"
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl glass-soft grid place-items-center shrink-0">
                            <Icon className="size-4 text-muted-foreground" />
                          </div>
                          <div className="leading-tight min-w-0">
                            <div className="font-medium truncate max-w-[160px]">{inv.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-muted-foreground">
                                {TYPE_LABEL[inv.type]}
                                {inv.quantity != null && inv.quantity > 0 && (
                                  <> · {inv.quantity.toLocaleString("pt-BR")} un.</>
                                )}
                              </span>
                              {inv.status === "redeemed" && <Pill tone="neutral">Resgatado</Pill>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell">
                        <Pill tone={typeTone(inv.type)}>{TYPE_GROUP[inv.type]}</Pill>
                      </td>
                      <td className="hidden md:table-cell text-muted-foreground text-[12.5px]">
                        {(() => {
                          const c = invCategory(inv.type);
                          if (c === "variable" || c === "crypto" || c === "fund") {
                            return <span className="italic opacity-60">Renda variável</span>;
                          }
                          return (
                            <>
                              {rateLabel(inv)}
                              <div className="text-[11px] opacity-70">{effectiveRate(inv, rates).toFixed(2)}% a.a.</div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="hidden md:table-cell text-muted-foreground">{inv.institution}</td>
                      <td className="text-right tabular-nums hidden sm:table-cell">{brl(principal)}</td>
                      <td className={cn("text-right tabular-nums", yld >= 0 ? "text-[var(--positive)]" : "text-[var(--negative)]")}>
                        <div>{yld >= 0 ? "+" : ""}{brl(yld)}</div>
                        <div className="text-[11px]">{yld >= 0 ? "+" : ""}{yldPct.toFixed(2)}%</div>
                      </td>
                      <td className="text-right tabular-nums font-medium">{brl(current)}</td>
                      <td>
                        <InvMenu
                          status={inv.status}
                          onEdit={() => openEdit(inv)}
                          onRedeem={() => handleRedeem(inv)}
                          onMove={() => openMove(inv)}
                          onDelete={() => openDelete(inv)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground text-center py-10">
            {investments.length === 0
              ? "Nenhum investimento cadastrado. Clique em Novo ativo para começar."
              : "Nenhum investimento nesta categoria."}
          </p>
        )}
      </GlassCard>

      {/* Bottom cards */}
      {hasActive && (
        <div className="grid md:grid-cols-3 gap-4">
          <GlassCard>
            <SectionTitle title="Melhor taxa" />
            {bestYield ? (
              <>
                <div className="mt-3 text-2xl font-semibold tabular-nums">
                  {effectiveRate(bestYield, rates).toFixed(2)}% a.a.
                </div>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  {bestYield.name} — {rateLabel(bestYield)}
                </p>
              </>
            ) : <p className="text-[12.5px] text-muted-foreground mt-3">—</p>}
          </GlassCard>

          <GlassCard>
            <SectionTitle title="Principal investido" />
            <div className="mt-3 text-2xl font-semibold tabular-nums">{brl(stats.principal)}</div>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Rendimento acumulado: {brl(stats.yield)} ({yieldPct >= 0 ? "+" : ""}{yieldPct.toFixed(2)}%)
            </p>
          </GlassCard>

          <GlassCard>
            <SectionTitle title="Próximo vencimento" />
            {nextMaturity ? (
              <>
                <div className="mt-3 text-2xl font-semibold tabular-nums">
                  {dateBR(nextMaturity.maturityDate!)}
                </div>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  {nextMaturity.name} —{" "}
                  {Math.max(0, Math.ceil((new Date(nextMaturity.maturityDate!).getTime() - Date.now()) / 86400000))} dias restantes
                </p>
              </>
            ) : (
              <p className="text-[12.5px] text-muted-foreground mt-3">
                Nenhum vencimento cadastrado.
              </p>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}

      {dialog === "move" && target && (
        <MoveModal investment={target} categories={categories} onSave={handleSaveMove} onClose={close} />
      )}

      {dialog === "rates" && (
        <RatesModal rates={rates} onSave={handleSaveRates} onClose={close} />
      )}

      {(dialog === "add" || dialog === "edit") && (
        <InvestmentModal
          initial={form}
          isEdit={dialog === "edit"}
          onSave={handleSaveInvestment}
          onClose={close}
        />
      )}

      {dialog === "delete" && target && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-[15px] font-semibold">Excluir investimento?</h2>
            <p className="text-[13px] text-muted-foreground">
              &ldquo;{target.name}&rdquo; e todos os seus lançamentos serão excluídos permanentemente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 h-9 rounded-xl glass-soft hover:bg-accent/40 text-[13px] transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 h-9 rounded-xl bg-[var(--negative)] text-white text-[13px] disabled:opacity-50 transition"
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