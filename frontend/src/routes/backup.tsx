import { createFileRoute } from "@tanstack/react-router";
import { HardDriveDownload, HardDriveUpload, FileJson, FileSpreadsheet, Folder, ShieldCheck, Clock } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";

export const Route = createFileRoute("/backup")({
  head: () => ({ meta: [{ title: "Backup e Exportação — Caderneta" }] }),
  component: Backup,
});

const history = [
  { id: 1, date: "20/05/2026 08:42", size: "1.8 MB", auto: true },
  { id: 2, date: "18/05/2026 22:10", size: "1.7 MB", auto: true },
  { id: 3, date: "15/05/2026 19:30", size: "1.6 MB", auto: false },
  { id: 4, date: "10/05/2026 09:05", size: "1.5 MB", auto: true },
];

function Backup() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup e Exportação"
        subtitle="Seus dados ficam 100% locais. Faça backups e exporte quando quiser."
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 size-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-primary/15 grid place-items-center">
              <ShieldCheck className="size-5 text-primary" />
            </div>
            <div>
              <div className="text-[15px] font-semibold">Backup automático ativo</div>
              <div className="text-[12.5px] text-muted-foreground mt-1">
                Salvo localmente em <span className="font-mono">~/Documentos/Caderneta/backups</span>
              </div>
              <div className="mt-2 text-[11.5px] text-muted-foreground flex items-center gap-2">
                <Clock className="size-3" /> Último backup há 4 horas · 1.8 MB
              </div>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="h-9 px-3 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium flex items-center gap-1.5"><HardDriveDownload className="size-4" /> Fazer backup agora</button>
            <button className="h-9 px-3 rounded-xl glass-soft hover:bg-accent/40 text-[13px] flex items-center gap-1.5"><HardDriveUpload className="size-4" /> Restaurar backup</button>
            <button className="h-9 px-3 rounded-xl glass-soft hover:bg-accent/40 text-[13px] flex items-center gap-1.5"><Folder className="size-4" /> Alterar pasta</button>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Exportar dados" />
          <div className="space-y-2">
            <button className="w-full glass-soft rounded-xl p-3 flex items-center gap-3 hover:bg-accent/40 transition text-left">
              <FileJson className="size-4 text-primary" />
              <div className="flex-1">
                <div className="text-[13px] font-medium">JSON completo</div>
                <div className="text-[11px] text-muted-foreground">Todos os dados estruturados</div>
              </div>
            </button>
            <button className="w-full glass-soft rounded-xl p-3 flex items-center gap-3 hover:bg-accent/40 transition text-left">
              <FileSpreadsheet className="size-4 text-[var(--positive)]" />
              <div className="flex-1">
                <div className="text-[13px] font-medium">CSV por tela</div>
                <div className="text-[11px] text-muted-foreground">Transações, faturas, recorrências…</div>
              </div>
            </button>
          </div>
        </GlassCard>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-5 pb-3"><SectionTitle title="Histórico de backups" /></div>
        <div className="divide-y divide-glass-border">
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/20 transition">
              <div className="size-9 rounded-xl glass-soft grid place-items-center">
                <HardDriveDownload className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-medium">{h.date}</div>
                <div className="text-[11.5px] text-muted-foreground">{h.size}</div>
              </div>
              <Pill tone={h.auto ? "info" : "neutral"}>{h.auto ? "Automático" : "Manual"}</Pill>
              <button className="text-[12px] glass-soft px-3 py-1.5 rounded-lg hover:bg-accent/40">Restaurar</button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
