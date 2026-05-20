import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  delta,
  hint,
  accent = "default",
  className,
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  accent?: "default" | "positive" | "negative" | "warning";
  className?: string;
}) {
  const accentClass = {
    default: "text-foreground",
    positive: "text-[var(--positive)]",
    negative: "text-[var(--negative)]",
    warning: "text-[var(--warning)]",
  }[accent];

  return (
    <div className={cn("glass rounded-2xl p-5 flex flex-col gap-1.5", className)}>
      <div className="text-[12px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-2xl lg:text-[28px] font-semibold num", accentClass)}>
        {value}
      </div>
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
        {delta && (
          <span
            className={cn(
              "px-1.5 py-0.5 rounded-md text-[11px]",
              delta.startsWith("+")
                ? "bg-[var(--positive)]/15 text-[var(--positive)]"
                : "bg-[var(--negative)]/15 text-[var(--negative)]",
            )}
          >
            {delta}
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "positive" | "negative" | "warning" | "info";
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    positive: "bg-[var(--positive)]/15 text-[var(--positive)]",
    negative: "bg-[var(--negative)]/15 text-[var(--negative)]",
    warning: "bg-[var(--warning)]/15 text-[var(--warning)]",
    info: "bg-[var(--info)]/15 text-[var(--info)]",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
