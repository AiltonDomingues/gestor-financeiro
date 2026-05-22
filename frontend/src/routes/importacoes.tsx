import { createFileRoute } from "@tanstack/react-router";
import {
  FileText, Upload, CheckCircle2, AlertCircle, ChevronDown,
  X, Loader2, ArrowRight, RotateCcw, Sparkles,
} from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { brl, dateBR } from "@/lib/format";
import { resolveCategory } from "@/lib/selectors";
import { useState, useCallback, useEffect } from "react";
import { SantanderStatementParser } from "@/services/import/santander-parser";
import { autoCategorize } from "@/services/import/auto-categorize";
import type { ParsedStatement, ParsedStatementItem } from "@/services/import/parser";

export const Route = createFileRoute("/importacoes")({
  head: () => ({ meta: [{ title: "Importações • GS" }] }),
  component: Importacoes,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type ReviewItem = {
  key: string;
  item: ParsedStatementItem;
  categoryId: string;
  selected: boolean;
};

type Flow =
  | { step: "idle" }
  | { step: "parsing" }
  | { step: "error"; message: string }
  | { step: "review"; file: File; cardId: string; parsed: ParsedStatement; items: ReviewItem[] }
  | { step: "saving" }
  | { step: "done"; count: number };

// ── Upload zone ───────────────────────────────────────────────────────────────

function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f?.type === "application/pdf" || f?.name.endsWith(".pdf")) onFile(f);
    },
    [onFile],
  );

  return (
    <label
      className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-3 cursor-pointer transition ${dragging ? "border-primary bg-primary/10" : "border-glass-border/70 hover:border-primary/40 hover:bg-accent/20"}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <div className="size-12 rounded-2xl bg-primary/15 grid place-items-center">
        <Upload className="size-6 text-primary" />
      </div>
      <div className="text-center">
        <div className="text-[15px] font-semibold">Arraste o PDF da fatura aqui</div>
        <p className="text-[13px] text-muted-foreground mt-1">ou clique para selecionar · apenas arquivos PDF</p>
      </div>
      <input type="file" accept=".pdf,application/pdf" className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </label>
  );
}

// ── Category select ───────────────────────────────────────────────────────────

function CategorySelect({ value, onChange, categories }: {
  value: string;
  onChange: (v: string) => void;
  categories: Array<{ id: string; name: string; emoji?: string }>;
}) {
  return (
    <CustomSelect
      size="sm"
      value={value}
      onChange={onChange}
      options={categories.map((c) => ({
        value: c.id,
        label: c.emoji ? `${c.emoji} ${c.name}` : c.name,
      }))}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

function Importacoes() {
  const { imports, cards, categories, categoryRules, addImportJob, updateImportJob, addStatement, addTransaction } = useAppData();
  const [flow, setFlow] = useState<Flow>({ step: "idle" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>(() => cards[0]?.id ?? "");
  const [creditsOpen, setCreditsOpen] = useState(false);

  // Sync selectedCard once cards load from IndexedDB (lazy initializer runs
  // before async data arrives, so selectedCard starts as "" if cards is empty).
  useEffect(() => {
    if (!selectedCard && cards.length > 0) {
      setSelectedCard(cards[0].id);
    }
  }, [cards, selectedCard]);

  // ── Parse PDF ──────────────────────────────────────────────────────────────

  async function handleParse() {
    if (!selectedFile || !selectedCard) return;
    setFlow({ step: "parsing" });
    try {
      const parser = new SantanderStatementParser();
      const parsed = await parser.parse(selectedFile);

      const items: ReviewItem[] = parsed.items.map((item, i) => ({
        key: `${i}-${item.date}-${item.description}`,
        item,
        categoryId: resolveCategory(item.description, categoryRules) ?? autoCategorize(item.description),
        selected: true,
      }));

      setFlow({ step: "review", file: selectedFile, cardId: selectedCard, parsed, items });
    } catch (err) {
      setFlow({ step: "error", message: (err as Error).message });
    }
  }

  // ── Confirm import ─────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (flow.step !== "review") return;
    const selected = flow.items.filter((r) => r.selected);
    if (selected.length === 0) return;

    setFlow({ step: "saving" });
    try {
      // 1. Create import job in context (DB + React state)
      const job = await addImportJob({
        file: flow.file.name,
        date: new Date().toISOString(),
        origin: "Santander",
        items: selected.length,
        errors: 0,
        duplicates: 0,
        status: "reviewed",
      });

      // 2. Create statement
      const statement = await addStatement({
        cardId: flow.cardId,
        reference: flow.parsed.reference,
        closingDate: flow.parsed.closingDate,
        dueDate: flow.parsed.dueDate,
        total: flow.parsed.total,
        minimum: Math.round(flow.parsed.total * 0.15 * 100) / 100,
        itemsCount: selected.length,
        status: "pendente",
      });

      // 3. Link job → statement
      await updateImportJob(job.id, { statementId: statement.id });

      // 4. Create transactions
      for (const r of selected) {
        await addTransaction({
          date: r.item.date,
          merchant: r.item.merchant,
          description: r.item.description,
          amount: r.item.amount,
          categoryId: r.categoryId,
          cardId: flow.cardId,
          statementId: statement.id,
          origin: "fatura",
          installment: r.item.installment,
          status: "pendente",
        });
      }

      setFlow({ step: "done", count: selected.length });
    } catch (err) {
      setFlow({ step: "error", message: (err as Error).message });
    }
  }

  function reset() {
    setSelectedFile(null);
    setFlow({ step: "idle" });
  }

  function toggleAll(checked: boolean) {
    if (flow.step !== "review") return;
    setFlow({ ...flow, items: flow.items.map((r) => ({ ...r, selected: checked })) });
  }

  function toggleItem(key: string) {
    if (flow.step !== "review") return;
    setFlow({ ...flow, items: flow.items.map((r) => r.key === key ? { ...r, selected: !r.selected } : r) });
  }

  function setCategoryForItem(key: string, categoryId: string) {
    if (flow.step !== "review") return;
    setFlow({ ...flow, items: flow.items.map((r) => r.key === key ? { ...r, categoryId } : r) });
  }

  const selectedCount = flow.step === "review" ? flow.items.filter((r) => r.selected).length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importações"
        subtitle="Extraia despesas de faturas PDF com categorização automática."
        actions={
          flow.step !== "idle" && flow.step !== "done" ? (
            <button onClick={reset} className="h-9 px-3 rounded-xl text-[13px] glass-soft hover:bg-accent/40 flex items-center gap-1.5 transition">
              <RotateCcw className="size-4" /> Reiniciar
            </button>
          ) : null
        }
      />

      {/* ── Step 1: Upload ──────────────────────────────────────────────────── */}
      {(flow.step === "idle" || flow.step === "error") && (
        <GlassCard>
          <SectionTitle title="Nova importação" />
          <div className="mt-4 space-y-4">

            {flow.step === "error" && (
              <div className="flex items-start gap-3 glass-soft rounded-xl p-3 text-[var(--negative)]">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <p className="text-[13px]">{flow.message}</p>
              </div>
            )}

            {/* Card selector */}
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                Cartão
              </label>
              {cards.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Cadastre um cartão antes de importar.</p>
              ) : (
                <CustomSelect
                  value={selectedCard}
                  onChange={setSelectedCard}
                  options={cards.map((c) => ({ value: c.id, label: `${c.name} •••• ${c.last4}` }))}
                  className="max-w-sm"
                />
              )}
            </div>

            {/* Drop zone */}
            <DropZone onFile={setSelectedFile} />

            {selectedFile && (
              <div className="flex items-center justify-between glass-soft rounded-xl px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <FileText className="size-4 text-primary" />
                  <span className="text-[13px] font-medium">{selectedFile.name}</span>
                  <span className="text-[11px] text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                </div>
                <button onClick={() => setSelectedFile(null)} className="size-6 rounded-lg hover:bg-accent/40 grid place-items-center transition" title="Remover arquivo">
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            <button
              onClick={handleParse}
              disabled={!selectedFile || !selectedCard}
              className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-40 transition"
            >
              <Sparkles className="size-4" /> Extrair transações
              <ArrowRight className="size-4" />
            </button>
          </div>
        </GlassCard>
      )}

      {/* ── Step 2: Parsing ─────────────────────────────────────────────────── */}
      {flow.step === "parsing" && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center gap-4">
          <Loader2 className="size-8 text-primary animate-spin" />
          <div className="text-[15px] font-semibold">Extraindo transações do PDF…</div>
          <p className="text-[13px] text-muted-foreground text-center max-w-xs">
            Lendo o Detalhamento da Fatura e aplicando categorização automática.
          </p>
        </div>
      )}

      {/* ── Step 3: Review table ─────────────────────────────────────────────── */}
      {flow.step === "review" && (
        <>
          {/* Header summary */}
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-[13px] text-muted-foreground">Fatura detectada</div>
                <div className="text-lg font-semibold mt-0.5">{flow.parsed.reference}</div>
                <div className="flex flex-wrap gap-4 mt-2 text-[13px]">
                  <span>Vencimento: <span className="font-medium">{dateBR(flow.parsed.dueDate)}</span></span>
                  <span>Total: <span className="num font-semibold text-[var(--negative)]">{brl(flow.parsed.total)}</span></span>
                  <span>{flow.parsed.items.length} transações extraídas</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="positive">
                  <Sparkles className="size-3" />
                  Auto-categorizado
                </Pill>
              </div>
            </div>
          </GlassCard>

          {/* Review table */}
          <GlassCard className="p-0 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
              <SectionTitle title="Revisar transações" hint={`${selectedCount} de ${flow.items.length} selecionadas`} />
              <div className="flex items-center gap-3 text-[12px]">
                <button onClick={() => toggleAll(true)} className="text-primary hover:opacity-70 transition">Todas</button>
                <button onClick={() => toggleAll(false)} className="text-muted-foreground hover:opacity-70 transition">Nenhuma</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-b border-glass-border">
                  <tr>
                    <th className="w-10 px-4 py-3" />
                    <th className="text-left font-medium px-2 py-3">Data</th>
                    <th className="text-left font-medium px-2 py-3">Descrição</th>
                    <th className="text-left font-medium px-2 py-3">Parcela</th>
                    <th className="text-left font-medium px-2 py-3">Categoria</th>
                    <th className="text-right font-medium px-4 py-3">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {flow.items.map((r) => (
                    <tr
                      key={r.key}
                      className={`border-b border-glass-border/50 transition ${r.selected ? "hover:bg-accent/20" : "opacity-40 hover:opacity-60"}`}
                    >
                      <td className="px-4 py-2.5">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggleItem(r.key)}
                          className="size-4 rounded accent-primary cursor-pointer"
                          title="Selecionar"
                        />
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground num whitespace-nowrap">
                        {dateBR(r.item.date)}
                      </td>
                      <td className="px-2 py-2.5 max-w-[200px] truncate font-medium">
                        {r.item.description}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground text-[11px] whitespace-nowrap">
                        {r.item.installment
                          ? `${r.item.installment.current}/${r.item.installment.total}`
                          : "—"}
                      </td>
                      <td className="px-2 py-2.5">
                        <CategorySelect
                          value={r.categoryId}
                          onChange={(v) => setCategoryForItem(r.key, v)}
                          categories={categories}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-right num font-semibold whitespace-nowrap">
                        {brl(r.item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Créditos e Pagamentos (colapsável) ───────────────────────── */}
            {flow.parsed.credits.length > 0 && (
              <div className="border-t border-glass-border">
                <button
                  className="w-full flex items-center justify-between px-5 py-3 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent/10 transition"
                  onClick={() => setCreditsOpen((v) => !v)}
                >
                  <span>
                    Créditos e Pagamentos
                    <span className="ml-1.5 text-[11px] opacity-70">({flow.parsed.credits.length} {flow.parsed.credits.length === 1 ? "item" : "itens"})</span>
                  </span>
                  <ChevronDown className={`size-4 transition-transform duration-200 ${creditsOpen ? "rotate-180" : ""}`} />
                </button>
                {creditsOpen && (
                  <table className="w-full text-[13px]">
                    <tbody>
                      {flow.parsed.credits.map((c, i) => (
                        <tr key={i} className="border-t border-glass-border/30 opacity-70">
                          <td className="w-10 px-4 py-2" />
                          <td className="px-2 py-2 text-muted-foreground num whitespace-nowrap">{dateBR(c.date)}</td>
                          <td className="px-2 py-2 max-w-[200px] truncate italic text-muted-foreground">{c.description}</td>
                          <td className="px-2 py-2" />
                          <td className="px-2 py-2 text-[11px] text-muted-foreground">crédito</td>
                          <td className="px-4 py-2 text-right num whitespace-nowrap text-[var(--positive)]">−{brl(c.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* ── Rodapé ───────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-glass-border">
              <div className="flex flex-wrap gap-4 text-[13px] text-muted-foreground">
                <span>Gastos selecionados: <span className="text-foreground font-semibold num">{brl(flow.items.filter((r) => r.selected).reduce((s, r) => s + r.item.amount, 0))}</span></span>
                {flow.parsed.credits.length > 0 && (
                  <>
                    <span className="opacity-40">−</span>
                    <span>Créditos: <span className="text-[var(--positive)] font-semibold num">−{brl(flow.parsed.credits.reduce((s, c) => s + c.amount, 0))}</span></span>
                    <span className="opacity-40">=</span>
                    <span>Saldo da fatura: <span className="text-[var(--negative)] font-semibold num">{brl(flow.parsed.total)}</span></span>
                  </>
                )}
              </div>
              <button
                onClick={handleConfirm}
                disabled={selectedCount === 0}
                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-40 transition"
              >
                <CheckCircle2 className="size-4" />
                Importar {selectedCount} transaç{selectedCount === 1 ? "ão" : "ões"}
              </button>
            </div>
          </GlassCard>
        </>
      )}

      {/* ── Step 4: Saving ─────────────────────────────────────────────────── */}
      {flow.step === "saving" && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center gap-4">
          <Loader2 className="size-8 text-primary animate-spin" />
          <div className="text-[15px] font-semibold">Salvando transações…</div>
        </div>
      )}

      {/* ── Step 5: Done ───────────────────────────────────────────────────── */}
      {flow.step === "done" && (
        <div className="glass rounded-3xl p-16 flex flex-col items-center gap-4 text-center">
          <div className="size-14 rounded-2xl bg-[var(--positive)]/15 grid place-items-center">
            <CheckCircle2 className="size-7 text-[var(--positive)]" />
          </div>
          <div>
            <div className="text-[18px] font-semibold">
              {flow.count} transaç{flow.count === 1 ? "ão importada" : "ões importadas"}!
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">
              As despesas já estão disponíveis em Transações e no Dashboard.
            </p>
          </div>
          <button onClick={reset} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-2 hover:opacity-90 transition">
            <Upload className="size-4" /> Importar outra fatura
          </button>
        </div>
      )}

      {/* ── Import history ─────────────────────────────────────────────────── */}
      {imports.length > 0 && flow.step === "idle" && (
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-3">
            <SectionTitle title="Histórico" hint={`${imports.length} importações`} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-[11px] uppercase tracking-wider text-muted-foreground border-y border-glass-border">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Arquivo</th>
                  <th className="text-left font-medium px-2 py-3">Origem</th>
                  <th className="text-left font-medium px-2 py-3">Data</th>
                  <th className="text-right font-medium px-2 py-3">Itens</th>
                  <th className="text-left font-medium px-2 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {[...imports].reverse().map((i) => {
                  const ok = i.status === "completed" || i.status === "reviewed";
                  return (
                    <tr key={i.id} className="border-b border-glass-border/60 hover:bg-accent/20 transition">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="size-8 rounded-xl glass-soft grid place-items-center">
                            <FileText className="size-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium truncate max-w-[180px]">{i.file}</span>
                        </div>
                      </td>
                      <td className="px-2 py-3 text-muted-foreground">{i.origin}</td>
                      <td className="px-2 py-3 text-muted-foreground">{dateBR(i.date)}</td>
                      <td className="px-2 py-3 text-right num">{i.items}</td>
                      <td className="px-2 py-3">
                        <Pill tone={ok ? "positive" : i.status === "failed" ? "negative" : "warning"}>
                          {ok ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                          {i.status}
                        </Pill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
