import { createFileRoute } from "@tanstack/react-router";
import { FileText, RefreshCw, Eye, Trash2, Upload, AlertCircle, CheckCircle2 } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { Pill, SectionTitle } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { dateBR } from "@/lib/format";

export const Route = createFileRoute("/importacoes")({
  head: () => ({ meta: [{ title: "Importações — Caderneta" }] }),
  component: Importacoes,
});

function Importacoes() {
  const { imports } = useAppData();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Importações"
        subtitle="Histórico do pipeline de extração de faturas e arquivos."
        actions={
          <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"><Upload className="size-4" /> Nova importação</button>
        }
      />

      <GlassCard className="p-0 overflow-hidden">
        <div className="p-5 pb-3">
          <SectionTitle title="Histórico" hint={`${imports.length} importações`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-y border-glass-border">
                <th className="text-left font-medium px-5 py-3">Arquivo</th>
                <th className="text-left font-medium px-2 py-3">Origem</th>
                <th className="text-left font-medium px-2 py-3">Data</th>
                <th className="text-right font-medium px-2 py-3">Itens</th>
                <th className="text-right font-medium px-2 py-3">Duplicatas</th>
                <th className="text-right font-medium px-2 py-3">Erros</th>
                <th className="text-left font-medium px-2 py-3">Status</th>
                <th className="text-right font-medium px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((i) => {
                const ok = i.status === "completed";
                return (
                  <tr key={i.id} className="border-b border-glass-border/60 hover:bg-accent/20 transition">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-xl glass-soft grid place-items-center">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="font-medium">{i.file}</div>
                          <div className="text-[11px] text-muted-foreground">PDF · 1.2 MB</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">{i.origin}</td>
                    <td className="px-2 py-3 text-muted-foreground">{dateBR(i.date)}</td>
                    <td className="px-2 py-3 text-right num">{i.items}</td>
                    <td className="px-2 py-3 text-right num text-muted-foreground">{i.duplicates}</td>
                    <td className="px-2 py-3 text-right num">{i.errors > 0 ? <span className="text-[var(--negative)]">{i.errors}</span> : <span className="text-muted-foreground">0</span>}</td>
                    <td className="px-2 py-3">
                      <Pill tone={ok ? "positive" : "warning"}>
                        {ok ? <CheckCircle2 className="size-3" /> : <AlertCircle className="size-3" />}
                        {i.status}
                      </Pill>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button className="size-8 rounded-lg glass-soft hover:bg-accent/40 grid place-items-center"><Eye className="size-3.5" /></button>
                        <button className="size-8 rounded-lg glass-soft hover:bg-accent/40 grid place-items-center"><RefreshCw className="size-3.5" /></button>
                        <button className="size-8 rounded-lg glass-soft hover:bg-accent/40 grid place-items-center text-[var(--negative)]"><Trash2 className="size-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
