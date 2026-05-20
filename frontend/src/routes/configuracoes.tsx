import { createFileRoute } from "@tanstack/react-router";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { SectionTitle } from "@/components/ui-bits";
import { Bell, Moon, Globe, DollarSign, Calendar, Folder, ShieldAlert, KeyRound, Eye, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Caderneta" }] }),
  component: Configuracoes,
});

function Toggle({ defaultChecked = false }: { defaultChecked?: boolean }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer">
      <input type="checkbox" defaultChecked={defaultChecked} className="sr-only peer" />
      <div className="w-10 h-5.5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors w-10 h-5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );
}

function Row({ icon: Icon, title, hint, action }: { icon: typeof Bell; title: string; hint?: string; action: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition">
      <div className="size-9 rounded-xl glass-soft grid place-items-center">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <div className="text-[13.5px] font-medium">{title}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
      {action}
    </div>
  );
}

function Configuracoes() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Personalize aparência, preferências e segurança local." />

      <div className="grid lg:grid-cols-2 gap-4">
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Aparência e formato" /></div>
          <div className="divide-y divide-glass-border">
            <Row icon={Moon} title="Tema escuro" hint="Use o botão no topo para alternar" action={<Toggle defaultChecked />} />
            <Row icon={Globe} title="Idioma" hint="Português (Brasil)" action={<button className="text-[12px] glass-soft px-3 py-1.5 rounded-lg">Alterar</button>} />
            <Row icon={DollarSign} title="Moeda" hint="Real brasileiro (R$)" action={<span className="text-[12px] text-muted-foreground">BRL</span>} />
            <Row icon={Calendar} title="Formato de data" hint="DD/MM/AAAA" action={<span className="text-[12px] text-muted-foreground">20/05/2026</span>} />
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Importação e dados" /></div>
          <div className="divide-y divide-glass-border">
            <Row icon={Folder} title="Pasta padrão de arquivos" hint="~/Documentos/Caderneta/faturas" action={<button className="text-[12px] glass-soft px-3 py-1.5 rounded-lg">Alterar</button>} />
            <Row icon={RefreshCw} title="Reprocessar regras ao importar" hint="Aplica regras vigentes a novos itens" action={<Toggle defaultChecked />} />
            <Row icon={Eye} title="Marcar pendentes para revisão" action={<Toggle defaultChecked />} />
            <Row icon={Bell} title="Notificações de limite" hint="Avisar quando categoria passar de 80%" action={<Toggle defaultChecked />} />
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Segurança local" /></div>
          <div className="divide-y divide-glass-border">
            <Row icon={KeyRound} title="PIN/senha local" hint="Proteger acesso ao app" action={<Toggle />} />
            <Row icon={ShieldAlert} title="Bloqueio automático" hint="Após 10 minutos inativo" action={<Toggle defaultChecked />} />
          </div>
        </GlassCard>

        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Dashboard" hint="Personalize widgets visíveis" /></div>
          <div className="divide-y divide-glass-border">
            <Row icon={Eye} title="Tendência mensal" action={<Toggle defaultChecked />} />
            <Row icon={Eye} title="Top estabelecimentos" action={<Toggle defaultChecked />} />
            <Row icon={Eye} title="Próximas recorrências" action={<Toggle defaultChecked />} />
            <Row icon={Eye} title="Metas ativas" action={<Toggle defaultChecked />} />
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[14px] font-semibold text-[var(--negative)]">Zona de risco</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Resete dados de demonstração ou apague tudo localmente.</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-9 px-3 rounded-xl glass-soft hover:bg-accent/40 text-[13px]">Resetar dados de demo</button>
            <button className="h-9 px-3 rounded-xl text-[13px] bg-[var(--negative)]/15 text-[var(--negative)] hover:bg-[var(--negative)]/25">Apagar tudo</button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
