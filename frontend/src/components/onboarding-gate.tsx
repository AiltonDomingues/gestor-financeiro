import { useState } from "react";
import { useAppData } from "@/state/app-data-context";

export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const { settings, updateSettings, loading } = useAppData();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return null;

  if (settings.userName.trim() !== "") {
    return <>{children}</>;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    await updateSettings({ userName: trimmed });
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass rounded-3xl p-10 max-w-sm w-full mx-4 space-y-8">
        <div className="text-center space-y-2">
          <div className="text-4xl mb-4">💰</div>
          <h1 className="text-xl font-semibold">Bem-vindo ao Gestor Financeiro</h1>
          <p className="text-[13px] text-muted-foreground">
            Antes de começar, como posso te chamar?
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            maxLength={60}
            className="w-full h-10 px-4 rounded-xl glass-soft text-[14px] bg-transparent focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            type="submit"
            disabled={!name.trim() || submitting}
            className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-[14px] font-medium disabled:opacity-50 transition-opacity"
          >
            Começar
          </button>
        </form>
      </div>
    </div>
  );
}
