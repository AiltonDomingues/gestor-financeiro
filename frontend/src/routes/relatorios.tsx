import { createFileRoute } from "@tanstack/react-router";
import { Download, FileJson, FileSpreadsheet, BarChart3, PieChart as PieIcon, LineChart as LineIcon } from "lucide-react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { SectionTitle } from "@/components/ui-bits";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { categorySpend, monthlyTrend } from "@/lib/mock-data";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Caderneta" }] }),
  component: Relatorios,
});

function Relatorios() {
  const cats = categorySpend.slice(0, 6);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Visualizações detalhadas e exportações dos seus dados financeiros."
        actions={
          <>
            <button className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5"><FileSpreadsheet className="size-4" /> CSV</button>
            <button className="h-9 px-3 rounded-xl text-[13px] glass hover:bg-accent/40 flex items-center gap-1.5"><FileJson className="size-4" /> JSON</button>
            <button className="h-9 px-3 rounded-xl text-[13px] bg-primary text-primary-foreground flex items-center gap-1.5"><Download className="size-4" /> Exportar PDF</button>
          </>
        }
      />

      {/* Filter bar */}
      <GlassCard className="p-3">
        <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
          <Tab label="Por período" active />
          <Tab label="Por categoria" />
          <Tab label="Por cartão" />
          <Tab label="Por estabelecimento" />
          <Tab label="Por recorrência" />
          <div className="ml-auto flex items-center gap-2 text-muted-foreground">
            <span>Período:</span>
            <button className="glass-soft px-2.5 py-1 rounded-lg">Últimos 6 meses</button>
          </div>
        </div>
      </GlassCard>

      <div className="grid lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title="Despesas por mês" action={<LineIcon className="size-4 text-muted-foreground" />} />
          <div className="h-72 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
                <XAxis dataKey="month" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => brl(v)} />
                <Line type="monotone" dataKey="despesas" stroke="oklch(0.72 0.16 255)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.16 255)" }} />
                <Line type="monotone" dataKey="receitas" stroke="oklch(0.72 0.16 158)" strokeWidth={2.5} dot={{ r: 3, fill: "oklch(0.72 0.16 158)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Composição" action={<PieIcon className="size-4 text-muted-foreground" />} />
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={cats} dataKey="spent" nameKey="name" outerRadius={80} stroke="none">
                  {cats.map((c, i) => <Cell key={i} fill={c.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => brl(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionTitle title="Detalhamento por categoria" action={<BarChart3 className="size-4 text-muted-foreground" />} />
        <div className="h-72 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categorySpend}>
              <CartesianGrid stroke="oklch(1 0 0 / 5%)" vertical={false} />
              <XAxis dataKey="name" stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="oklch(0.68 0.018 255)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v/1000).toFixed(1)}k`} />
              <Tooltip contentStyle={{ background: "oklch(0.22 0.02 260)", border: "1px solid oklch(1 0 0 / 10%)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => brl(v)} />
              <Bar dataKey="spent" radius={[6, 6, 0, 0]} barSize={28}>
                {categorySpend.map((c, i) => <Cell key={i} fill={c.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}

function Tab({ label, active }: { label: string; active?: boolean }) {
  return (
    <button className={`px-3 py-1.5 rounded-lg transition ${active ? "bg-primary/20 text-primary border border-primary/30" : "glass-soft hover:bg-accent/40 text-muted-foreground"}`}>
      {label}
    </button>
  );
}
