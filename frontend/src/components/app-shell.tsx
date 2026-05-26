import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  CreditCard,
  Tags,
  Wallet,
  Target,
  TrendingUp,
  Repeat,
  Sparkles,
  BarChart3,
  Activity,
  Upload,
  HardDriveDownload,
  Settings,
  Search,
  Plus,
  Command,
  Sun,
  Moon,
  Bell,
  ChevronDown,
  X,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppData } from "@/state/app-data-context";
import { usePeriod, periodLabel } from "@/state/period-context";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { brl } from "@/lib/format";
import type { Category, Transaction } from "@/domain/types";

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/fluxo", label: "Fluxo de Caixa", icon: Activity },
  { to: "/faturas", label: "Faturas", icon: FileText },
  { to: "/transacoes", label: "Transações", icon: Receipt },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/categorias", label: "Categorias", icon: Tags },
  { to: "/orcamentos", label: "Orçamentos", icon: Wallet },
  { to: "/metas", label: "Metas", icon: Target },
  { to: "/investimentos", label: "Investimentos", icon: TrendingUp },
  { to: "/recorrencias", label: "Recorrências", icon: Repeat },
  { to: "/insights", label: "Insights", icon: Sparkles },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/importacoes", label: "Importações", icon: Upload },
  { to: "/backup", label: "Backup e Exportação", icon: HardDriveDownload },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function useTheme() {
  const { settings, updateSettings } = useAppData();
  const theme = settings.theme;
  const setTheme = (t: "dark" | "light") => void updateSettings({ theme: t });
  return { theme, setTheme };
}

function buildMonthOptions() {
  const now = new Date();
  const options: { year: number; month: number; label: string }[] = [];
  for (let i = 11; i >= -1; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ year: d.getFullYear(), month: d.getMonth(), label: periodLabel(d.getFullYear(), d.getMonth()) });
  }
  return options;
}

// ── Notifications ─────────────────────────────────────────────────────────────

type Notif = { id: string; level: "warn" | "info"; title: string; body: string };

function buildNotifs(transactions: Transaction[], categories: Category[]): Notif[] {
  const now = new Date();
  const yy = now.getFullYear();
  const mm = now.getMonth();
  const list: Notif[] = [];
  for (const cat of categories) {
    if (!cat.budget) continue;
    const spent = transactions
      .filter((t) => {
        const d = new Date(t.date);
        return t.categoryId === cat.id && t.amount < 0 && d.getFullYear() === yy && d.getMonth() === mm;
      })
      .reduce((s, t) => s + Math.abs(t.amount), 0);
    const ratio = spent / cat.budget;
    if (ratio >= 1) {
      list.push({
        id: `budget-over-${cat.id}`,
        level: "warn",
        title: `Limite ultrapassado — ${cat.name}`,
        body: `Gasto ${brl(spent)} de ${brl(cat.budget)} (${Math.round(ratio * 100)}%)`,
      });
    } else if (ratio >= 0.8) {
      list.push({
        id: `budget-warn-${cat.id}`,
        level: "warn",
        title: `Atenção — ${cat.name}`,
        body: `${Math.round(ratio * 100)}% do orçamento mensal usado`,
      });
    }
  }
  return list;
}

// ── NotifDropdown ─────────────────────────────────────────────────────────────

function NotifDropdown({
  notifs,
  onClose,
  anchorRef,
}: {
  notifs: Notif[];
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const dropRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!anchorRef.current || !dropRef.current) return;
    const r = anchorRef.current.getBoundingClientRect();
    dropRef.current.style.top = `${r.bottom + 6}px`;
    dropRef.current.style.right = `${window.innerWidth - r.right}px`;
  });
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div ref={dropRef} className="fixed z-50 w-80 glass rounded-2xl shadow-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-glass-border flex items-center justify-between">
          <span className="text-[13px] font-semibold">Notificações</span>
          <button onClick={onClose} title="Fechar" className="text-muted-foreground hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
        {notifs.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">Nenhum alerta no momento</div>
        ) : (
          <div className="divide-y divide-glass-border">
            {notifs.map((n) => (
              <div key={n.id} className="px-4 py-3 flex gap-3 hover:bg-accent/30 transition">
                <AlertCircle className={cn("size-4 mt-0.5 shrink-0", n.level === "warn" ? "text-amber-400" : "text-blue-400")} />
                <div>
                  <div className="text-[12.5px] font-medium">{n.title}</div>
                  <div className="text-[11.5px] text-muted-foreground">{n.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}

// ── SearchOverlay ─────────────────────────────────────────────────────────────

function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { transactions } = useAppData();
  const lower = q.toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const navResults = q ? nav.filter((n) => n.label.toLowerCase().includes(lower)) : nav.slice(0, 6);
  const txResults = q
    ? transactions.filter((t) => t.merchant.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower)).slice(0, 5)
    : [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col items-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl glass rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-glass-border">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar páginas, transações…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            title="Busca global"
          />
          <button onClick={onClose} title="Fechar" className="text-[11px] text-muted-foreground border border-glass-border rounded px-1.5 py-0.5 hover:text-foreground">
            Esc
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {navResults.length > 0 && (
            <>
              <div className="px-4 py-1 text-[10.5px] uppercase tracking-widest text-muted-foreground">Páginas</div>
              {navResults.map((n) => {
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to as string} onClick={onClose} className="flex items-center gap-3 px-4 py-2 hover:bg-accent/40 transition text-[13px]">
                    <Icon className="size-4 text-muted-foreground shrink-0" />
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </>
          )}
          {txResults.length > 0 && (
            <>
              <div className="px-4 py-1 mt-1 text-[10.5px] uppercase tracking-widest text-muted-foreground">Transações</div>
              {txResults.map((t) => (
                <Link key={t.id} to="/transacoes" onClick={onClose} className="flex items-center justify-between px-4 py-2 hover:bg-accent/40 transition text-[13px]">
                  <div className="flex items-center gap-3">
                    {t.amount < 0 ? <ArrowDownLeft className="size-4 text-destructive shrink-0" /> : <ArrowUpRight className="size-4 text-emerald-400 shrink-0" />}
                    <div>
                      <div>{t.merchant}</div>
                      {t.description && t.description !== t.merchant && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-52">{t.description}</div>
                      )}
                    </div>
                  </div>
                  <span className={cn("text-[12px] font-medium shrink-0", t.amount < 0 ? "text-destructive" : "text-emerald-400")}>
                    {brl(t.amount)}
                  </span>
                </Link>
              ))}
            </>
          )}
          {q && navResults.length === 0 && txResults.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-muted-foreground">Nenhum resultado encontrado</div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ── QuickAddModal ─────────────────────────────────────────────────────────────

function QuickAddModal({ onClose }: { onClose: () => void }) {
  const { addTransaction, categories, cards } = useAppData();
  const today = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<"expense" | "income">("expense");
  const [date, setDate] = useState(today);
  const [merchant, setMerchant] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [categoryId, setCategoryId] = useState(
    categories.find((c) => (c.type ?? "expense") === "expense")?.id ?? categories[0]?.id ?? "",
  );
  const [cardId, setCardId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filteredCats = categories.filter((c) =>
    type === "expense" ? (c.type ?? "expense") === "expense" : c.type === "income",
  );

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function submit() {
    const amt = parseFloat(amountStr.replace(",", "."));
    if (!merchant.trim()) { setError("Informe o estabelecimento."); return; }
    if (!amt || amt <= 0) { setError("Informe um valor válido."); return; }
    if (!categoryId) { setError("Selecione uma categoria."); return; }
    setError("");
    setSaving(true);
    try {
      await addTransaction({
        date,
        merchant: merchant.trim(),
        description: merchant.trim(),
        amount: type === "expense" ? -Math.abs(amt) : Math.abs(amt),
        categoryId,
        cardId: cardId || undefined,
        origin: "manual",
        status: "revisada",
      });
      onClose();
    } catch {
      setError("Erro ao salvar. Tente novamente.");
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md glass rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-glass-border flex items-center justify-between">
          <span className="text-[15px] font-semibold">Nova transação</span>
          <button onClick={onClose} title="Fechar" className="size-7 rounded-lg glass-soft flex items-center justify-center text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-xl glass-soft p-1 gap-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setType(t);
                  const first = categories.find((c) => (c.type ?? "expense") === (t === "expense" ? "expense" : "income"));
                  setCategoryId(first?.id ?? "");
                }}
                className={cn(
                  "flex-1 h-8 rounded-lg text-[13px] font-medium transition flex items-center justify-center gap-1.5",
                  type === t
                    ? t === "expense" ? "bg-destructive/20 text-destructive" : "bg-emerald-400/20 text-emerald-400"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "expense" ? <ArrowDownLeft className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                {t === "expense" ? "Despesa" : "Receita"}
              </button>
            ))}
          </div>
          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11.5px] text-muted-foreground font-medium">Data</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} title="Data"
                className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-transparent outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[11.5px] text-muted-foreground font-medium">Valor (R$)</label>
              <input type="number" min="0" step="0.01" placeholder="0,00" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} title="Valor"
                className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-transparent outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
          {/* Merchant */}
          <div className="space-y-1">
            <label className="text-[11.5px] text-muted-foreground font-medium">Estabelecimento / Descrição</label>
            <input type="text" placeholder="Ex: Supermercado Extra" value={merchant} onChange={(e) => setMerchant(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }} title="Estabelecimento"
              className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-transparent outline-none focus:ring-1 focus:ring-primary" />
          </div>
          {/* Category */}
          <div className="space-y-1">
            <label className="text-[11.5px] text-muted-foreground font-medium">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} title="Categoria"
              className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary">
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {/* Card (optional) */}
          {cards.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11.5px] text-muted-foreground font-medium">Cartão <span className="text-muted-foreground/60">(opcional)</span></label>
              <select value={cardId} onChange={(e) => setCardId(e.target.value)} title="Cartão"
                className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-background outline-none focus:ring-1 focus:ring-primary">
                <option value="">— Nenhum —</option>
                {cards.map((c) => <option key={c.id} value={c.id}>**** {c.last4} — {c.name}</option>)}
              </select>
            </div>
          )}
          {error && <p className="text-[12px] text-destructive">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-glass-border flex gap-2 justify-end">
          <button onClick={onClose} className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 disabled:opacity-50 transition">
            {saving ? "Salvando…" : "Salvar"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { theme, setTheme } = useTheme();
  const { settings, transactions, categories } = useAppData();
  const { period, setPeriod, label: periodLabelText } = usePeriod();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifBtnRef = useRef<HTMLButtonElement>(null);
  const monthOptions = buildMonthOptions();
  const userName = settings.userName;
  const initials = userName
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const notifications = buildNotifs(transactions, categories);
  const notifCount = notifications.length;

  // ⌘K / Ctrl+K global shortcut opens search
  const handleGlobalKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      setSearchOpen((v) => !v);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKey);
    return () => window.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

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
              <span className="text-[15px] font-semibold tracking-tight">Gestor Financeiro</span>
              <span className="text-[11px] text-muted-foreground">Finanças pessoais</span>
            </div>
          </div>

          {/* Period selector */}
          <div className="mx-1 mb-3 relative">
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              className="w-full glass-soft rounded-xl px-3 py-2.5 text-left text-sm flex items-center justify-between hover:bg-accent/40 transition"
            >
              <div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Período</div>
                <div className="font-medium">{periodLabelText}</div>
              </div>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", periodOpen && "rotate-180")} />
            </button>
            {periodOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPeriodOpen(false)} />
                <div className="absolute left-0 right-0 z-20 mt-1 bg-popover border border-border rounded-xl shadow-xl py-1 max-h-64 overflow-y-auto text-[13px]">
                  {monthOptions.map((opt) => {
                    const active = opt.year === period.year && opt.month === period.month;
                    return (
                      <button
                        key={`${opt.year}-${opt.month}`}
                        onClick={() => { setPeriod({ year: opt.year, month: opt.month }); setPeriodOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 hover:bg-accent/40 transition",
                          active ? "text-primary font-medium" : "text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

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
                  <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer / user */}
          <div className="mt-3 pt-3 border-t border-glass-border flex items-center gap-3 px-2">
            <div className="size-8 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 grid place-items-center text-[12px] font-semibold text-primary-foreground">
              {initials}
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-[13px] font-medium truncate">{userName}</span>
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
            {/* Search trigger */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <button
                onClick={() => setSearchOpen(true)}
                className="relative flex-1 flex items-center gap-2 h-9 px-3 rounded-xl glass-soft text-left hover:bg-accent/40 transition"
                title="Buscar (Ctrl+K)"
              >
                <Search className="size-4 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground/70 flex-1 hidden sm:block">
                  Buscar transações, categorias…
                </span>
                <kbd className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground px-1.5 py-0.5 rounded border border-glass-border">
                  <Command className="size-3" /> K
                </kbd>
              </button>
            </div>
            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="size-9 rounded-xl hover:bg-accent/40 grid place-items-center text-muted-foreground hover:text-foreground transition"
                aria-label="Alternar tema"
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
              <button
                ref={notifBtnRef}
                onClick={() => setNotifOpen((v) => !v)}
                title="Notificações"
                className="size-9 rounded-xl hover:bg-accent/40 grid place-items-center text-muted-foreground hover:text-foreground transition relative"
              >
                <Bell className="size-4" />
                {notifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] rounded-full bg-amber-400 text-[9px] font-bold text-black flex items-center justify-center px-0.5">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </button>
              <div className="w-px h-6 bg-glass-border mx-1" />
              <Link
                to="/importacoes"
                className="h-9 px-3 rounded-xl text-[13px] font-medium text-foreground hover:bg-accent/40 transition flex items-center gap-1.5"
              >
                <Upload className="size-4" />
                <span className="hidden md:inline">Importar fatura</span>
              </Link>
              <button
                onClick={() => setTxModalOpen(true)}
                className="h-9 px-3 rounded-xl text-[13px] font-medium bg-primary text-primary-foreground hover:opacity-90 transition flex items-center gap-1.5 shadow-[0_8px_24px_-8px_oklch(0.72_0.16_255/.6)]"
              >
                <Plus className="size-4" />
                <span className="hidden md:inline">Nova transação</span>
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-6">{children}</div>
      </main>

      {/* Overlays */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
      {txModalOpen && <QuickAddModal onClose={() => setTxModalOpen(false)} />}
      {notifOpen && (
        <NotifDropdown
          notifs={notifications}
          onClose={() => setNotifOpen(false)}
          anchorRef={notifBtnRef}
        />
      )}
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
