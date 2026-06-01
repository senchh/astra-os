"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Toolset } from "@/lib/hermes/types";

function Switch({
  on,
  pending,
  onClick,
}: {
  on: boolean;
  pending: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-pressed={on}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-60",
        on ? "border-green/60 bg-green/25" : "border-edge bg-bg-2"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 grid h-4 w-4 -translate-y-1/2 place-items-center rounded-full transition-all",
          on ? "left-[1.4rem] bg-green" : "left-0.5 bg-faint"
        )}
        style={on ? { boxShadow: "0 0 8px var(--color-green)" } : undefined}
      >
        {pending && <Loader2 className="h-3 w-3 animate-spin text-bg" />}
      </span>
    </button>
  );
}

export function ToolsBoard({ initial }: { initial: Toolset[] }) {
  const [tools, setTools] = useState<Toolset[]>(initial);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const enabledCount = tools.filter((t) => t.enabled).length;

  async function toggle(id: string) {
    const current = tools.find((t) => t.id === id);
    if (!current) return;
    const next = !current.enabled;

    setError(null);
    setPending((p) => new Set(p).add(id));
    // Optimistic flip.
    setTools((ts) => ts.map((t) => (t.id === id ? { ...t, enabled: next } : t)));

    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enable: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Değişiklik uygulanamadı.");
      }
    } catch (e) {
      // Revert on failure.
      setTools((ts) => ts.map((t) => (t.id === id ? { ...t, enabled: !next } : t)));
      setError(`${id}: ${(e as Error).message}`);
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  }

  return (
    <>
      <section className="grid grid-cols-3 gap-4">
        <div className="panel relative overflow-hidden p-4">
          <span
            className="absolute left-0 top-0 h-full w-[3px]"
            style={{ background: "var(--color-green)", boxShadow: "0 0 14px var(--color-green)" }}
          />
          <div className="label">aktif</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{enabledCount}</div>
        </div>
        <div className="panel relative overflow-hidden p-4">
          <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: "var(--color-faint)" }} />
          <div className="label">kapalı</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {tools.length - enabledCount}
          </div>
        </div>
        <div className="panel relative overflow-hidden p-4">
          <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: "var(--color-cyan)" }} />
          <div className="label">toplam</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{tools.length}</div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
          {error}
        </div>
      )}

      <section className="panel divide-y divide-edge overflow-hidden">
        {tools.map((t) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-fg">{t.label}</div>
              <div className="font-mono text-xs text-faint">{t.id}</div>
            </div>
            <span
              className={cn(
                "text-[0.625rem] font-semibold uppercase tracking-wider",
                t.enabled ? "text-green" : "text-faint"
              )}
            >
              {t.enabled ? "açık" : "kapalı"}
            </span>
            <Switch on={t.enabled} pending={pending.has(t.id)} onClick={() => toggle(t.id)} />
          </div>
        ))}
      </section>
    </>
  );
}
