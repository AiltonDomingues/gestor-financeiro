import { createFileRoute } from "@tanstack/react-router";
import {
  HardDriveDownload,
  HardDriveUpload,
  FileJson,
  FileSpreadsheet,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useRef, useState } from "react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { downloadBackupJSON } from "@/services/backup";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "Backup e Exportação • GS" }] }),
  component: Backup,
});

// ── Backup history tracked in localStorage ─────────────────────────────────────

const HISTORY_KEY = "caderneta_backup_history";

interface HistoryEntry {
  id: string;
  date: string; // ISO
  size: string;
  auto: boolean;
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 20)));
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDatetime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

function Backup() {
  const { exportBackup, importBackup, transactions, categories, cards } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [pendingJson, setPendingJson] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Backup ──────────────────────────────────────────────────────────────────

  async function handleBackupNow() {
    setBusy("backup");
    try {
      const json = await exportBackup();
      const size = fmtBytes(new Blob([json]).size);
      downloadBackupJSON(json);
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        size,
        auto: false,
      };
      const updated = [entry, ...history];
      saveHistory(updated);
      setHistory(updated);
      showToast("Backup realizado com sucesso!");
    } catch {
      showToast("Erro ao gerar backup.", false);
    } finally {
      setBusy(null);
    }
  }

  // ── Restore ─────────────────────────────────────────────────────────────────

  function handleRestoreClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPendingJson(ev.target?.result as string);
    };
    reader.readAsText(file, "utf-8");
    e.target.value = "";
  }

  async function confirmRestore() {
    if (!pendingJson) return;
    setPendingJson(null);
    setBusy("restore");
    try {
      await importBackup(pendingJson);
      showToast("Backup restaurado! Recarregue a página para aplicar todos os dados.");
    } catch (err) {
      showToast(`Erro: ${err instanceof Error ? err.message : "arquivo inválido"}`, false);
    } finally {
      setBusy(null);
    }
  }

  // ── CSV export ──────────────────────────────────────────────────────────────

  function exportCSV() {
    const header = ["Data", "Estabelecimento", "Descrição", "Categoria", "Valor (R$)", "Cartão"].join(",");
    const rows = [...transactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) =>
        [
          t.date,
          `"${t.merchant.replace(/"/g, '""')}"`,
          `"${t.description.replace(/"/g, '""')}"`,
          `"${categories.find((c) => c.id === t.categoryId)?.name ?? ""}"`,
          t.amount.toFixed(2),
          `"${cards.find((c) => c.id === t.cardId)?.name ?? "Manual"}"`,
        ].join(","),
      );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exportado!");
  }

  const lastBackup = history[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup e Exportação"
        subtitle="Seus dados ficam 100% locais. Faça backups e exporte quando quiser."
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[13px] font-medium shadow-xl
            ${toast.ok ? "bg-[var(--positive)] text-white" : "bg-destructive text-white"}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Restore confirmation dialog */}
      {pendingJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <GlassCard className="max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="size-10 rounded-xl bg-destructive/15 grid place-items-center shrink-0">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <div className="text-[14px] font-semibold">Restaurar backup?</div>
                <div className="text-[12.5px] text-muted-foreground mt-1">
                  Todos os dados atuais serão apagados e substituídos pelo arquivo selecionado. Essa ação não pode ser desfeita.
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingJson(null)}
                className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRestore}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-[13px] font-medium"
              >
                Restaurar agora
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        aria-label="Selecionar arquivo de backup"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Main backup card */}
        <GlassCard className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-primary/15 grid place-items-center">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-[15px] font-semibold">Backup manual</div>
              <div className="text-[12.5px] text-muted-foreground mt-1">
                Exporta todos os dados como arquivo <span className="font-mono">.json</span> que pode ser restaurado depois.
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground flex items-center gap-2">
                <Clock className="size-3" />
                {lastBackup
                  ? `Último backup em ${fmtDatetime(lastBackup.date)} · ${lastBackup.size}`
                  : "Nenhum backup realizado ainda"}
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleBackupNow}
              disabled={!!busy}
              className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-1.5 disabled:opacity-60"
            >
              <HardDriveDownload className="size-4" />
              {busy === "backup" ? "Gerando…" : "Fazer backup agora"}
            </button>
            <button
              onClick={handleRestoreClick}
              disabled={!!busy}
              className="h-9 px-3 rounded-xl glass-soft hover:bg-accent/40 text-[13px] flex items-center gap-1.5 disabled:opacity-60"
            >
              <HardDriveUpload className="size-4" />
              {busy === "restore" ? "Restaurando…" : "Restaurar backup"}
            </button>
          </div>
        </GlassCard>

        {/* Export card */}
        <GlassCard>
          <SectionTitle title="Exportar dados" />
          <div className="space-y-2">
            <button
              onClick={handleBackupNow}
              disabled={!!busy}
              className="w-full glass-soft rounded-xl p-3 flex items-center gap-3 hover:bg-accent/40 transition text-left disabled:opacity-60"
            >
              <FileJson className="size-4 text-primary" />
              <div className="flex-1">
                <div className="text-[13px] font-medium">JSON completo</div>
                <div className="text-[11px] text-muted-foreground">Todos os dados estruturados</div>
              </div>
            </button>
            <button
              onClick={exportCSV}
              className="w-full glass-soft rounded-xl p-3 flex items-center gap-3 hover:bg-accent/40 transition text-left"
            >
              <FileSpreadsheet className="size-4 text-[var(--positive)]" />
              <div className="flex-1">
                <div className="text-[13px] font-medium">CSV de transações</div>
                <div className="text-[11px] text-muted-foreground">
                  {transactions.length} transações · compatível com Excel
                </div>
              </div>
            </button>
          </div>
        </GlassCard>
      </div>

      {/* Backup history */}
      <GlassCard className="p-0 overflow-hidden">
        <div className="p-5 pb-3">
          <SectionTitle title="Histórico de backups" />
        </div>
        {history.length === 0 ? (
          <div className="px-5 pb-5 text-[13px] text-muted-foreground">Nenhum backup realizado ainda.</div>
        ) : (
          <div className="divide-y divide-glass-border">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition">
                <div className="size-9 rounded-xl glass-soft grid place-items-center">
                  <HardDriveDownload className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-medium">{fmtDatetime(h.date)}</div>
                  <div className="text-[11.5px] text-muted-foreground">{h.size}</div>
                </div>
                <Pill tone={h.auto ? "info" : "neutral"}>{h.auto ? "Automático" : "Manual"}</Pill>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
