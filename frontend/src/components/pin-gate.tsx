import { useEffect, useRef, useState } from "react";
import { Lock, Delete } from "lucide-react";
import { useAppData } from "@/state/app-data-context";

// ── Hash helper ────────────────────────────────────────────────────────────────

export async function hashPin(pin: string): Promise<string> {
  const encoded = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Session flag (in-memory only — cleared when the app process exits) ────────

let _sessionUnlocked = false;

function isUnlocked() {
  return _sessionUnlocked;
}

function markUnlocked() {
  _sessionUnlocked = true;
}

function markLocked() {
  _sessionUnlocked = false;
}

// ── PinPad UI ─────────────────────────────────────────────────────────────────

interface PinPadProps {
  title: string;
  subtitle: string;
  onComplete: (pin: string) => void;
  error?: string;
}

function PinPad({ title, subtitle, onComplete, error }: PinPadProps) {
  const [pin, setPin] = useState("");

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (pin.length === 4) {
      onComplete(pin);
      setPin("");
    }
  }, [pin, onComplete]);

  function press(digit: string) {
    setPin((p) => (p.length < 4 ? p + digit : p));
  }

  function backspace() {
    setPin((p) => p.slice(0, -1));
  }

  const pad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="glass rounded-3xl p-8 max-w-xs w-full mx-4 text-center">
      <div className="size-14 mx-auto mb-5 rounded-2xl bg-primary/15 grid place-items-center">
        <Lock className="size-6 text-primary" />
      </div>
      <div className="text-[15px] font-semibold">{title}</div>
      <div className="text-[12.5px] text-muted-foreground mt-1">{subtitle}</div>

      {/* Dot indicator */}
      <div className="flex justify-center gap-3 mt-6 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`size-3.5 rounded-full border-2 transition-all duration-150
              ${i < pin.length ? "bg-primary border-primary scale-110" : "border-muted-foreground/40"}`}
          />
        ))}
      </div>

      {/* Error */}
      <div className={`text-[12px] text-destructive mt-2 h-4 transition-opacity ${error ? "opacity-100" : "opacity-0"}`}>
        {error ?? " "}
      </div>

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2.5 mt-4">
        {pad.map((key, idx) => {
          if (key === "") return <div key={idx} />;
          if (key === "⌫") {
            return (
              <button
                key={idx}
                onClick={backspace}
                title="Apagar"
                className="h-14 rounded-2xl glass-soft hover:bg-accent/40 transition flex items-center justify-center"
              >
                <Delete className="size-5 text-muted-foreground" />
              </button>
            );
          }
          return (
            <button
              key={idx}
              onClick={() => press(key)}
              className="h-14 rounded-2xl glass-soft hover:bg-accent/40 transition text-xl font-medium"
            >
              {key}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── PinGate ────────────────────────────────────────────────────────────────────

export function PinGate({ children }: { children: React.ReactNode }) {
  const { settings } = useAppData();
  const { pinEnabled, pinHash, autoLock, autoLockMinutes } = settings.security;

  const [locked, setLocked] = useState(() => pinEnabled && !isUnlocked());
  const [error, setError] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Re-evaluate lock state when pinEnabled changes
  useEffect(() => {
    if (!pinEnabled) {
      setLocked(false);
    } else if (!isUnlocked()) {
      setLocked(true);
    }
  }, [pinEnabled]);

  // Inactivity auto-lock
  useEffect(() => {
    if (!pinEnabled || !autoLock || locked) return;

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        markLocked();
        setLocked(true);
        setError("");
      }, autoLockMinutes * 60 * 1000);
    };

    const events = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [pinEnabled, autoLock, autoLockMinutes, locked]);

  if (!locked) return <>{children}</>;

  async function handlePin(pin: string) {
    const hash = await hashPin(pin);
    if (hash === pinHash) {
      markUnlocked();
      setLocked(false);
      setError("");
    } else {
      setError("PIN incorreto. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-background/95 backdrop-blur-md">
      <PinPad
        title="App bloqueado"
        subtitle="Digite seu PIN para continuar"
        onComplete={handlePin}
        error={error}
      />
    </div>
  );
}

// Re-export PinPad for use in configuracoes
export { PinPad };
