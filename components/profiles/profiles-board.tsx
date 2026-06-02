"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/hermes/profiles";

function GatewayDot({ status }: { status: string }) {
  const running = status.toLowerCase() === "running";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn("h-2 w-2 rounded-full", running ? "bg-green" : "bg-faint")}
        style={running ? { boxShadow: "0 0 8px var(--color-green)" } : undefined}
      />
      <span className={running ? "text-green" : "text-faint"}>{status || "—"}</span>
    </span>
  );
}

export function ProfilesBoard({ initial }: { initial: Profile[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = initial.find((p) => p.active);

  async function use(name: string) {
    if (!confirm(`Aktif profil "${name}" olsun mu?\n\nBu, Hermes CLI çağrılarını (chat, tools, cron) bu profile yönlendirir. Geri almak için varsayılana dönebilirsin.`))
      return;

    setError(null);
    setPending(name);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "use", name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Profil değiştirilemedi.");
      }
      router.refresh();
    } catch (e) {
      setError(`${name}: ${(e as Error).message}`);
    } finally {
      setPending((p) => (p === name ? null : p));
    }
  }

  return (
    <>
      {/* Observability touch — which profile Astra's CLI calls currently route to. */}
      <div className="panel flex items-center gap-2.5 p-4 text-sm">
        <Terminal className="h-4 w-4 text-cyan" strokeWidth={1.75} />
        <span className="text-muted">Aktif CLI profili:</span>
        <span className="font-mono text-fg">{active?.name ?? "—"}</span>
        <span className="ml-auto text-xs text-faint">
          Profil değiştirmek Hermes CLI çağrılarını yönlendirir (geri alınabilir).
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {initial.map((p) => (
          <div
            key={p.name}
            className={cn(
              "panel relative overflow-hidden p-4",
              p.active && "ring-1 ring-cyan/40"
            )}
          >
            {p.active && (
              <span
                className="absolute left-0 top-0 h-full w-[3px]"
                style={{ background: "var(--color-cyan)", boxShadow: "0 0 14px var(--color-cyan)" }}
              />
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight">{p.name}</span>
                {p.active && (
                  <span className="flex items-center gap-1 rounded-full border border-cyan/50 bg-cyan/15 px-2 py-0.5 text-[0.625rem] font-semibold uppercase tracking-wider text-cyan">
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2.5} /> aktif
                  </span>
                )}
              </div>
              <GatewayDot status={p.gateway} />
            </div>

            <dl className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between gap-4">
                <dt className="text-faint">model</dt>
                <dd className="font-mono text-muted">{p.model || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-faint">alias</dt>
                <dd className="font-mono text-muted">{p.alias ?? "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-faint">distribution</dt>
                <dd className="font-mono text-muted">{p.distribution ?? "—"}</dd>
              </div>
            </dl>

            <div className="mt-4">
              {p.active ? (
                <span className="text-xs text-faint">Şu an kullanılıyor</span>
              ) : (
                <button
                  onClick={() => use(p.name)}
                  disabled={pending === p.name}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan/60 bg-cyan/15 px-3 py-1.5 text-xs font-medium text-cyan transition-colors hover:bg-cyan/25 disabled:opacity-50"
                >
                  {pending === p.name && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Aktif yap
                </button>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
