import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
  Tags,
  Wallet,
  Target,
  Repeat,
  Sparkles,
  BarChart3,
  Upload,
  HardDriveDownload,
  Settings,
  Search,
  Plus,
  Command,
  Sun,
  Moon,
  Bell,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/faturas", label: "Faturas", icon: FileText },
  { to: "/transacoes", label: "Transações", icon: Receipt },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/orcamentos", label: "Orçamentos", icon: Wallet },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/recorrencias", label: "Recorrências", icon: Repeat },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/importacoes", label: "Importações", icon: Upload },
  { to: "/backup", label: "Backup e Exportação", icon: HardDriveDownload },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", theme === "dark");
  }, [theme]);
  return { theme, setTheme };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen w-full flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col gap-1 p-4 sticky top-0 h-screen">
        <div className="glass rounded-2xl p-4 flex flex-col h-full">
          {/* Brand */}
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-4">
            <div className="size-9 rounded-xl bg-gradient-to-br from-primary to-chart-3 grid place-items-center shadow-[0_8px_24px_-8px_oklch(0.72_0.16_255/.6)]">
              <Wallet className="size-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[15px] font-semibold tracking-tight">Caderneta</span>
              <span className="text-[11px] text-muted-foreground">Finanças pessoais</span>
            </div>
          </div>

          {/* Period selector */}
          <button className="mx-1 mb-3 glass-soft rounded-xl px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-accent/40 transition">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Período</div>
              <div className="font-medium">Maio de 2026</div>
            </div>
            <svg className="size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
          </button>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto pr-0.5 -mr-0.5 flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as string}
                  className={cn(
                    "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] transition relative",
                    active
                      ? "bg-gradient-to-r from-primary/20 to-primary/5 text-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/40",
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full bg-primary" />
                  )}
                  <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / user */}
          <div className="mt-3 pt-3 border-t border-glass-border flex items-center gap-3 px-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 grid place-items-center text-[12px] font-semibold text-primary-foreground">
              AD
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-medium truncate">Ailton Domingues</span>
              <span className="text-[11px] text-muted-foreground truncate">Local · Criptografado</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 px-4 lg:px-6 pt-4">
          <div className="glass rounded-2xl h-14 px-3 lg:px-4 flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  placeholder="Buscar transações, categorias, cartões…"
                  className="w-full bg-transparent pl-9 pr-16 py-2 text-sm placeholder:text-muted-foreground/70 outline-none"
                />
                <kbd className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded-md border border-glass-border">
                  <Command className="size-3" /> K
                </kbd>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="size-9 rounded-xl hover:bg-accent/40 grid place-items-center text-muted-foreground hover:text-foreground transition"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button className="size-9 rounded-xl hover:bg-accent/40 grid place-items-center text-muted-foreground hover:text-foreground transition relative">
                <Bell className="size-4" />
                <span className="absolute top-2 right-2 size-1.5 rounded-full bg-primary" />
              </button>
              <div className="w-px h-6 bg-glass-border mx-1" />
              <button className="h-9 px-3 rounded-xl text-[13px] font-medium text-foreground hover:bg-accent/40 transition flex items-center gap-1.5">
                <Upload className="size-4" /> <span className="hidden md:inline">Importar fatura</span>
              </button>
              <button className="h-9 px-3 rounded-xl text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1.5 shadow-[0_8px_24px_-8px_oklch(0.72_0.16_255/.6)]">
                <Plus className="size-4" /> <span className="hidden md:inline">Nova transação</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)}>{children}</div>
  );
}
