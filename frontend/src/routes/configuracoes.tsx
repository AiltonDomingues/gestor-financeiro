import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  Moon,
  Sun,
  DollarSign,
  Calendar,
  Eye,
  RefreshCw,
  ShieldAlert,
  KeyRound,
  TrendingUp,
  AlertTriangle,
  BarChart2,
  Repeat,
  Target,
} from "lucide-react";
import { useState, useCallback } from "react";
import { GlassCard, PageHeader } from "@/components/app-shell";
import { SectionTitle, CustomSelect } from "@/components/ui-bits";
import { useAppData } from "@/state/app-data-context";
import { hashPin, PinPad } from "@/components/pin-gate";
import { db } from "@/data/db";

import type { Currency, DateFormat } from "@/domain/types";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações • GS" }] }),
  component: Configuracoes,
});

// ── Shared mini-components ─────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label="toggle"
        className="sr-only peer"
      />
      <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
    </label>
  );
}

function Row({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-accent/20 transition">
      <div className="size-9 rounded-xl glass-soft grid place-items-center shrink-0">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium">{title}</div>
        {hint && <div className="text-[11.5px] text-muted-foreground">{hint}</div>}
      </div>
      {action}
    </div>
  );
}



// ── Main component ─────────────────────────────────────────────────────────────

function Configuracoes() {
  const { settings, updateSettings } = useAppData();

  // Local state for fields with explicit save buttons
  const [userName, setUserName] = useState(settings.userName);
  const [rates, setRates] = useState({ ...settings.economicRates });
  const [dangerAction, setDangerAction] = useState<"clear" | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // PIN dialog state: "set-new" | "confirm-new" | "verify-disable" | "verify-change" | "set-change"
  type PinFlow = "set-new" | "confirm-new" | "verify-disable" | "verify-change" | "set-change" | null;
  const [pinFlow, setPinFlow] = useState<PinFlow>(null);
  const [pinStage1, setPinStage1] = useState(""); // stores first entry before confirm
  const [pinError, setPinError] = useState("");

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // Toggle helpers — save immediately
  function toggleRoot(
    key: "reprocessRulesOnImport" | "markPendingForReview" | "limitNotifications",
    val: boolean,
  ) {
    updateSettings({ [key]: val });
  }

  function toggleDashboard(key: keyof typeof settings.dashboard, val: boolean) {
    updateSettings({ dashboard: { ...settings.dashboard, [key]: val } });
  }

  function toggleSecurity(key: keyof typeof settings.security, val: boolean) {
    updateSettings({ security: { ...settings.security, [key]: val } });
  }

  // ── PIN flow ─────────────────────────────────────────────────────────────────

  function closePinFlow() {
    setPinFlow(null);
    setPinStage1("");
    setPinError("");
  }

  const handlePinStep = useCallback(async (pin: string) => {
    const sec = settings.security;

    if (pinFlow === "set-new" || pinFlow === "set-change") {
      // First entry — store and ask to confirm
      setPinStage1(pin);
      setPinError("");
      setPinFlow(pinFlow === "set-new" ? "confirm-new" : "confirm-new");
      return;
    }

    if (pinFlow === "confirm-new") {
      if (pin !== pinStage1) {
        setPinError("Os PINs não coincidem. Tente novamente.");
        setPinStage1("");
        // Go back to first step
        setPinFlow("set-new");
        return;
      }
      const hash = await hashPin(pin);
      updateSettings({ security: { ...sec, pinEnabled: true, pinHash: hash } });
      closePinFlow();
      showToast("PIN definido com sucesso!");
      return;
    }

    if (pinFlow === "verify-disable") {
      const hash = await hashPin(pin);
      if (hash !== sec.pinHash) {
        setPinError("PIN incorreto.");
        return;
      }
      updateSettings({ security: { ...sec, pinEnabled: false, pinHash: "" } });
      closePinFlow();
      showToast("PIN removido.");
      return;
    }

    if (pinFlow === "verify-change") {
      const hash = await hashPin(pin);
      if (hash !== sec.pinHash) {
        setPinError("PIN atual incorreto.");
        return;
      }
      setPinStage1("");
      setPinError("");
      setPinFlow("set-change");
      return;
    }
  }, [pinFlow, pinStage1, settings.security, updateSettings]);

  // ── Danger zone ──────────────────────────────────────────────────────────────

  async function executeDanger() {
    if (!dangerAction) return;
    setDangerAction(null);
    try {
      await db.adapter.clearAll();
      window.location.reload();
    } catch {
      showToast("Erro ao executar a operação.", false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        subtitle="Personalize aparência, preferências e parâmetros do app."
      />

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-[13px] font-medium shadow-xl
            ${toast.ok ? "bg-[var(--positive)] text-white" : "bg-destructive text-white"}`}
        >
          {toast.msg}
        </div>
      )}

      {/* Danger confirmation dialog */}
      {dangerAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <GlassCard className="max-w-sm w-full mx-4">
            <div className="flex items-start gap-3 mb-5">
              <div className="size-10 rounded-xl bg-destructive/15 grid place-items-center shrink-0">
                <AlertTriangle className="size-5 text-destructive" />
              </div>
              <div>
                <div className="text-[14px] font-semibold">Apagar todos os dados?</div>
                <div className="text-[12.5px] text-muted-foreground mt-1">
                  Todos os dados serão apagados permanentemente. Faça um backup antes. A página será recarregada.
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDangerAction(null)}
                className="h-9 px-4 rounded-xl glass-soft text-[13px] hover:bg-accent/40"
              >
                Cancelar
              </button>
              <button
                onClick={executeDanger}
                className="h-9 px-4 rounded-xl bg-destructive text-destructive-foreground text-[13px] font-medium"
              >
                Confirmar
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* PIN entry dialog */}
      {pinFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative">
            <PinPad
              title={
                pinFlow === "set-new" || pinFlow === "set-change"
                  ? "Definir PIN"
                  : pinFlow === "confirm-new"
                  ? "Confirmar PIN"
                  : pinFlow === "verify-disable"
                  ? "Confirmar desativação"
                  : "Verificar PIN atual"
              }
              subtitle={
                pinFlow === "set-new" || pinFlow === "set-change"
                  ? "Escolha um PIN de 4 dígitos"
                  : pinFlow === "confirm-new"
                  ? "Digite o PIN novamente"
                  : "Digite seu PIN atual para continuar"
              }
              onComplete={handlePinStep}
              error={pinError}
            />
            <button
              onClick={closePinFlow}
              className="absolute -top-3 -right-3 size-8 rounded-full glass-soft text-muted-foreground hover:text-foreground text-lg leading-none"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">

        {/* ── Perfil ───────────────────────────────────────────────────────── */}
        <GlassCard>
          <SectionTitle title="Perfil" />
          <div className="mt-3 space-y-3">
            <div>
              <label className="text-[11.5px] text-muted-foreground mb-1.5 block">Seu nome</label>
              <input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Nome exibido no app"
              />
            </div>
            <button
              onClick={() => { updateSettings({ userName }); showToast("Nome salvo!"); }}
              className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium"
            >
              Salvar
            </button>
          </div>
        </GlassCard>

        {/* ── Aparência e formato ───────────────────────────────────────────── */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Aparência e formato" /></div>
          <div className="divide-y divide-glass-border">
            <Row
              icon={settings.theme === "dark" ? Moon : Sun}
              title="Tema"
              hint={settings.theme === "dark" ? "Escuro" : "Claro"}
              action={
                <Toggle
                  checked={settings.theme === "dark"}
                  onChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
                />
              }
            />
            <Row
              icon={DollarSign}
              title="Moeda"
              hint="Afeta exibição de valores"
              action={
                <CustomSelect
                  size="sm"
                  value={settings.currency}
                  options={[
                    { value: "BRL", label: "BRL — Real" },
                    { value: "USD", label: "USD — Dólar" },
                    { value: "EUR", label: "EUR — Euro" },
                  ]}
                  onChange={(v) => updateSettings({ currency: v as Currency })}
                />
              }
            />
            <Row
              icon={Calendar}
              title="Formato de data"
              action={
                <CustomSelect
                  size="sm"
                  value={settings.dateFormat}
                  options={[
                    { value: "DD/MM/YYYY", label: "DD/MM/AAAA" },
                    { value: "MM/DD/YYYY", label: "MM/DD/AAAA" },
                    { value: "YYYY-MM-DD", label: "AAAA-MM-DD" },
                  ]}
                  onChange={(v) => updateSettings({ dateFormat: v as DateFormat })}
                />
              }
            />
          </div>
        </GlassCard>

        {/* ── Importação e dados ────────────────────────────────────────────── */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Importação e dados" /></div>
          <div className="divide-y divide-glass-border">
            <Row
              icon={RefreshCw}
              title="Reprocessar regras ao importar"
              hint="Aplica regras vigentes a novos itens"
              action={
                <Toggle
                  checked={settings.reprocessRulesOnImport}
                  onChange={(v) => toggleRoot("reprocessRulesOnImport", v)}
                />
              }
            />
            <Row
              icon={Eye}
              title="Marcar pendentes para revisão"
              hint="Importações ficam com status 'pendente'"
              action={
                <Toggle
                  checked={settings.markPendingForReview}
                  onChange={(v) => toggleRoot("markPendingForReview", v)}
                />
              }
            />
            <Row
              icon={Bell}
              title="Alertas de limite de categoria"
              hint="Avisa quando categoria passar de 80%"
              action={
                <Toggle
                  checked={settings.limitNotifications}
                  onChange={(v) => toggleRoot("limitNotifications", v)}
                />
              }
            />
          </div>
        </GlassCard>

        {/* ── Dashboard ─────────────────────────────────────────────────────── */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Dashboard" hint="Widgets visíveis" /></div>
          <div className="divide-y divide-glass-border">
            <Row
              icon={BarChart2}
              title="Tendência mensal"
              action={
                <Toggle
                  checked={settings.dashboard.showMonthlyTrend}
                  onChange={(v) => toggleDashboard("showMonthlyTrend", v)}
                />
              }
            />
            <Row
              icon={TrendingUp}
              title="Top estabelecimentos"
              action={
                <Toggle
                  checked={settings.dashboard.showTopMerchants}
                  onChange={(v) => toggleDashboard("showTopMerchants", v)}
                />
              }
            />
            <Row
              icon={Repeat}
              title="Próximas recorrências"
              action={
                <Toggle
                  checked={settings.dashboard.showUpcomingRecurring}
                  onChange={(v) => toggleDashboard("showUpcomingRecurring", v)}
                />
              }
            />
            <Row
              icon={Target}
              title="Metas ativas"
              action={
                <Toggle
                  checked={settings.dashboard.showGoals}
                  onChange={(v) => toggleDashboard("showGoals", v)}
                />
              }
            />
          </div>
        </GlassCard>

        {/* ── Segurança local ───────────────────────────────────────────────── */}
        <GlassCard className="p-0 overflow-hidden">
          <div className="p-5 pb-2"><SectionTitle title="Segurança local" /></div>
          <div className="divide-y divide-glass-border">
            <Row
              icon={KeyRound}
              title="PIN de acesso"
              hint={settings.security.pinEnabled ? "Ativado — app bloqueado ao sair" : "Proteger o app com senha numérica"}
              action={
                settings.security.pinEnabled ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPinFlow("verify-change")}
                      className="text-[12px] glass-soft px-3 py-1.5 rounded-lg hover:bg-accent/40"
                    >
                      Alterar
                    </button>
                    <Toggle
                      checked={true}
                      onChange={() => setPinFlow("verify-disable")}
                    />
                  </div>
                ) : (
                  <Toggle
                    checked={false}
                    onChange={() => setPinFlow("set-new")}
                  />
                )
              }
            />
            <Row
              icon={ShieldAlert}
              title="Bloqueio automático"
              hint="Protege o app após inatividade"
              action={
                <Toggle
                  checked={settings.security.autoLock}
                  onChange={(v) => toggleSecurity("autoLock", v)}
                />
              }
            />
            {settings.security.autoLock && (
              <Row
                icon={ShieldAlert}
                title="Tempo até bloquear"
                hint="Inatividade necessária"
                action={
                  <CustomSelect
                    size="sm"
                    value={String(settings.security.autoLockMinutes)}
                    options={[
                      { value: "5", label: "5 min" },
                      { value: "10", label: "10 min" },
                      { value: "15", label: "15 min" },
                      { value: "30", label: "30 min" },
                    ]}
                    onChange={(v) =>
                      updateSettings({
                        security: { ...settings.security, autoLockMinutes: Number(v) },
                      })
                    }
                  />
                }
              />
            )}
          </div>
        </GlassCard>

        {/* ── Taxas econômicas ──────────────────────────────────────────────── */}
        <GlassCard>
          <SectionTitle title="Taxas econômicas" hint="Usadas em simulações de investimento" />
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(["selic", "cdi", "ipca"] as const).map((key) => (
              <div key={key}>
                <label className="text-[11px] text-muted-foreground uppercase tracking-wide block mb-1.5">
                  {key.toUpperCase()} % a.a.
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={rates[key]}
                  onChange={(e) =>
                    setRates((r) => ({ ...r, [key]: parseFloat(e.target.value) || 0 }))
                  }
                  aria-label={`${key.toUpperCase()} % a.a.`}
                  className="w-full h-9 px-3 rounded-xl glass-soft text-[13px] bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ))}
          </div>
          {settings.economicRates.updatedAt && (
            <div className="mt-2 text-[11.5px] text-muted-foreground">
              Atualizado em{" "}
              {new Date(settings.economicRates.updatedAt).toLocaleDateString("pt-BR")}
            </div>
          )}
          <button
            onClick={() => {
              updateSettings({
                economicRates: { ...rates, updatedAt: new Date().toISOString() },
              });
              showToast("Taxas salvas!");
            }}
            className="mt-4 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[13px] font-medium"
          >
            Salvar taxas
          </button>
        </GlassCard>

      </div>

      {/* ── Zona de risco ──────────────────────────────────────────────────── */}
      <GlassCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-semibold text-[var(--negative)]">Zona de risco</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              Apague todos os dados permanentemente.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setDangerAction("clear")}
              className="h-9 px-3 rounded-xl text-[13px] bg-[var(--negative)]/15 text-[var(--negative)] hover:bg-[var(--negative)]/25"
            >
              Apagar tudo
            </button>
          </div>
        </div>
      </GlassCard>

    </div>
  );
}
