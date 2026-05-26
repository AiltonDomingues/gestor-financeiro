import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";
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

export function CustomSelect({
  value,
  onChange,
  options,
  className,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ readonly value: string; readonly label: string }>;
  className?: string;
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const isSmall = size === "sm";

  // Track button position while open
  useEffect(() => {
    if (!open) return;
    const update = () => setRect(btnRef.current?.getBoundingClientRect() ?? null);
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  // Apply position imperatively — flip upward when near the bottom of the viewport
  useLayoutEffect(() => {
    if (!dropRef.current || !rect) return;
    const dropH = dropRef.current.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flipUp = spaceBelow < dropH + 8 && spaceAbove > spaceBelow;
    dropRef.current.style.top = flipUp
      ? `${rect.top - dropH - 4}px`
      : `${rect.bottom + 4}px`;
    dropRef.current.style.left = `${rect.left}px`;
    dropRef.current.style.minWidth = `${rect.width}px`;
  }, [rect]);

  return (
    <div className={cn("relative", className)}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2 text-left glass-soft hover:bg-accent/40 transition outline-none",
          isSmall ? "h-7 px-2 rounded-lg text-[12px]" : "h-9 px-3 rounded-lg text-[13px]",
        )}
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDown
          className={cn(
            "shrink-0 text-muted-foreground transition-transform",
            isSmall ? "size-3" : "size-3.5",
            open && "rotate-180",
          )}
        />
      </button>
      {open && rect && createPortal(
        <>
          <div className="fixed inset-0 z-[199]" onClick={() => setOpen(false)} />
          <div
            ref={dropRef}
            className={cn(
              "z-[200] fixed glass rounded-xl shadow-xl py-1 overflow-y-auto",
              isSmall ? "max-h-48 text-[12px]" : "max-h-60 text-[13px]",
            )}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn(
                  "w-full text-left px-3 py-2 hover:bg-accent/40 transition flex items-center justify-between gap-2",
                  o.value === value && "text-primary font-medium",
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && <Check className="size-3.5 shrink-0" />}
              </button>
            ))}
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}
