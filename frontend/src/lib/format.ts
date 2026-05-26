export const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(n);

export const brlCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1000) return brl(n).replace(",00", "");
  return brl(n);
};

export const dateBR = (d: Date | string) => {
  const date = typeof d === "string"
    ? new Date(d.length === 10 ? d + "T12:00:00" : d)
    : d;
  return new Intl.DateTimeFormat("pt-BR").format(date);
};

export const monthBR = (d: Date | string) => {
  const date = typeof d === "string" ? new Date(d) : d;
  const s = new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    year: "numeric",
  }).format(date);
  return s.charAt(0).toUpperCase() + s.slice(1).replace(" de ", " de ");
};

export const pct = (n: number, digits = 0) =>
  `${(n * 100).toFixed(digits).replace(".", ",")}%`;

export function toMonthly(amount: number, periodicity: string): number {
  switch (periodicity) {
    case "Semanal":   return amount * (52 / 12);
    case "Quinzenal": return amount * (26 / 12);
    case "Anual":     return amount / 12;
    default:          return amount; // Mensal
  }
}
