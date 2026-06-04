"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Square, RotateCw, Loader2, Check, AlertTriangle } from "lucide-react";
import type { GatewayInfo } from "@/lib/hermes/types";
import { relTime } from "@/lib/utils";

type Action = "start" | "stop" | "restart";

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={`h-2 w-2 shrink-0 rounded-full ${pulse ? "animate-pulse" : ""}`}
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

/**
 * Gateway lifecycle (start / stop / restart) via `hermes gateway`, owning the
 * whole panel body so the up/down line, channel list, and buttons stay in sync.
 *
 * `gateway_state.json` LAGS lifecycle transitions — right after a restart it can
 * still read "stopped" / "disconnected" for a second or two before the respawned
 * process writes "running" + reconnects. So a single refresh races the file. We
 * (1) reflect the expected state *optimistically* the instant the command
 * succeeds, and (2) poll `router.refresh()` until the file settles on the target.
 */
export function GatewayControl({ gateway }: { gateway: GatewayInfo }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  // The state we're waiting for the lagging file to confirm (null = settled).
  const [expecting, setExpecting] = useState<"running" | "stopped" | null>(null);
  const attempts = useRef(0);
  const expectingSince = useRef(0);

  // Poll until gateway_state.json catches up to the action we just took.
  useEffect(() => {
    if (!expecting) return;
    // A minimum dwell is required before we trust state === expecting: a *restart*
    // starts and ends on "running" with a brief "stopped" dip in between, so an
    // immediate value match is the stale pre-action state, not a real settle. We
    // ride the window until the file has had time to show (and recover from) the dip.
    const dwelled = Date.now() - expectingSince.current >= 2500;
    // Settled (file agrees, after the dwell) or gave up after ~12s → stop optimism.
    // The clear is deferred (rAF) to avoid a synchronous setState in the effect.
    if ((gateway.state === expecting && dwelled) || attempts.current >= 8) {
      const raf = requestAnimationFrame(() => {
        attempts.current = 0;
        setExpecting(null);
      });
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      attempts.current += 1;
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [expecting, gateway, router]);

  const transitioning = expecting !== null;
  const running = transitioning ? expecting === "running" : gateway.state === "running";
  const connected = gateway.platforms.filter((p) => p.state === "connected").map((p) => p.name);

  async function fire(action: Action) {
    setBusy(action);
    setPending(null);
    setResult(null);
    try {
      const res = await fetch("/api/gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const verb =
          action === "start" ? "başlatıldı" : action === "stop" ? "durduruldu" : "yeniden başlatıldı";
        setResult({ ok: true, text: `Gateway ${verb}.` });
        // Optimistically reflect the target, then poll the file until it agrees.
        attempts.current = 0;
        expectingSince.current = Date.now();
        setExpecting(action === "stop" ? "stopped" : "running");
        router.refresh();
      } else {
        setResult({ ok: false, text: data.error || "İşlem başarısız." });
      }
    } catch {
      setResult({ ok: false, text: "Sunucuya ulaşılamadı." });
    } finally {
      setBusy(null);
    }
  }

  function onClick(action: Action) {
    if (action === "start") fire(action);
    else setPending((p) => (p === action ? null : action));
  }

  const blastRadius =
    connected.length > 0
      ? `${connected.map((c) => c[0].toUpperCase() + c.slice(1)).join(", ")} teslimatı`
      : "kanal teslimatı";

  // Status line.
  const statusText = transitioning
    ? expecting === "running"
      ? "Gateway başlatılıyor…"
      : "Gateway durduruluyor…"
    : running
      ? "Gateway çalışıyor"
      : `Gateway: ${gateway.state}`;
  const statusColor = transitioning
    ? "var(--color-amber)"
    : running
      ? "var(--color-green)"
      : "var(--color-faint)";

  const locked = busy !== null || transitioning;

  return (
    <>
      <div className="mt-3 flex items-center gap-2.5">
        <Dot color={statusColor} pulse={transitioning} />
        <span className="text-sm text-fg">{statusText}</span>
        {!transitioning && gateway.updatedAt && (
          // relTime is "now"-relative, so SSR and hydration differ by ~1s — expected.
          <span className="ml-auto text-xs text-faint" suppressHydrationWarning>
            {relTime(gateway.updatedAt)}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {gateway.platforms.length === 0 && (
          <div className="text-xs text-faint">Bağlı kanal yok.</div>
        )}
        {gateway.platforms.map((pl) => {
          const up = pl.state === "connected";
          return (
            <div key={pl.name} className="flex items-center gap-2.5 text-sm">
              <Dot color={up ? "var(--color-green)" : "var(--color-amber)"} />
              <span className="capitalize text-fg">{pl.name}</span>
              <span className="ml-auto text-xs text-muted">{pl.state}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 border-t border-edge pt-3">
        <div className="flex flex-wrap items-center gap-2">
          {!running && (
            <Btn
              onClick={() => onClick("start")}
              busy={busy === "start"}
              disabled={locked}
              icon={Play}
              label="Başlat"
              tone="ok"
            />
          )}
          {running && (
            <>
              <Btn
                onClick={() => onClick("restart")}
                busy={busy === "restart"}
                disabled={locked}
                active={pending === "restart"}
                icon={RotateCw}
                label="Yeniden başlat"
                tone="warn"
              />
              <Btn
                onClick={() => onClick("stop")}
                busy={busy === "stop"}
                disabled={locked}
                active={pending === "stop"}
                icon={Square}
                label="Durdur"
                tone="danger"
              />
            </>
          )}
          {gateway.pid && (
            <span className="ml-auto text-[0.625rem] text-faint">PID {gateway.pid}</span>
          )}
        </div>

        {pending && (
          <div className="mt-3 rounded-lg border border-amber/40 bg-amber/5 p-3">
            <div className="flex items-start gap-2 text-xs text-amber">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {pending === "stop" ? "Durdurmak" : "Yeniden başlatmak"} <b>{blastRadius}</b>
                {pending === "stop" ? "nı keser" : "nı kısa süre kesintiye uğratır"} · cron işleri
                gateway üzerinden teslim ediliyor.
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <button
                onClick={() => fire(pending)}
                className="rounded-md bg-amber px-2.5 py-1 text-[0.6875rem] font-medium text-bg"
              >
                Onayla, {pending === "stop" ? "durdur" : "yeniden başlat"}
              </button>
              <button
                onClick={() => setPending(null)}
                className="rounded-md border border-edge px-2.5 py-1 text-[0.6875rem] text-muted hover:text-fg"
              >
                Vazgeç
              </button>
            </div>
          </div>
        )}

        {result && (
          <div
            className={`mt-2.5 flex items-center gap-1.5 text-xs ${
              result.ok ? "text-green" : "text-red"
            }`}
          >
            {result.ok && <Check className="h-3.5 w-3.5" />}
            {result.text}
            {transitioning && <span className="text-faint">· durum güncelleniyor…</span>}
          </div>
        )}
      </div>
    </>
  );
}

function Btn({
  onClick,
  busy,
  disabled,
  active,
  icon: Icon,
  label,
  tone,
}: {
  onClick: () => void;
  busy: boolean;
  disabled?: boolean;
  active?: boolean;
  icon: typeof Play;
  label: string;
  tone: "ok" | "warn" | "danger";
}) {
  const ring =
    tone === "ok"
      ? "border-green/40 text-green hover:bg-green/10"
      : tone === "warn"
        ? "border-amber/40 text-amber hover:bg-amber/10"
        : "border-red/40 text-red hover:bg-red/10";
  const activeBg = !active
    ? "bg-transparent"
    : tone === "warn"
      ? "bg-amber/10"
      : tone === "danger"
        ? "bg-red/10"
        : "bg-green/10";
  return (
    <button
      onClick={onClick}
      disabled={busy || disabled}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${ring} ${activeBg}`}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}
