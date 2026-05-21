import { createContext, useContext, useState } from "react";

export type Period = { year: number; month: number }; // month: 0-indexed

type PeriodContextValue = {
  period: Period;
  setPeriod: (p: Period) => void;
  label: string;
};

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function periodLabel(year: number, month: number): string {
  const raw = new Date(year, month, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const [period, setPeriod] = useState<Period>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  return (
    <PeriodContext.Provider
      value={{ period, setPeriod, label: periodLabel(period.year, period.month) }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within PeriodProvider");
  return ctx;
}
