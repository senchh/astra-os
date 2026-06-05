"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Image as ImageIcon,
  Camera,
  Sparkles,
  Rocket,
  Loader2,
  Clock,
  Cpu,
  Wrench,
  AlertCircle,
  History,
  Trash2,
  ImageIcon as ImgBadge,
} from "lucide-react";
import { TASK_PRESETS } from "@/lib/hermes/task-presets";
import type { TaskRunResult } from "@/lib/hermes/types";
import {
  loadRuns,
  addRun,
  removeRun,
  clearRuns,
  newRunId,
  type StoredRun,
} from "@/lib/run-history";
import { cn, compactNum, relTime } from "@/lib/utils";

const ICONS: Record<string, typeof Globe> = {
  Globe,
  Image: ImageIcon,
  Camera,
  Sparkles,
};

/**
 * Action trigger: fire a one-shot agent task (`hermes -z`) and show the result —
 * final text + any image artifacts it produced + an observability strip (duration,
 * model, toolset, tokens, tool-calls). Fire-and-forget, costs tokens, runs the agent.
 */
export function RunLauncher({ model, provider }: { model: string; provider: string }) {
  const [presetId, setPresetId] = useState(TASK_PRESETS[0]?.id ?? "");
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<TaskRunResult | null>(null);
  const [history, setHistory] = useState<StoredRun[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);

  // Run history is local-first (localStorage) — load it after mount. The rAF
  // defers the setState out of the effect body (avoids cascading-render lint).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setHistory(loadRuns()));
    return () => cancelAnimationFrame(raf);
  }, []);

  const preset = TASK_PRESETS.find((p) => p.id === presetId) ?? TASK_PRESETS[0];

  async function go() {
    const text = input.trim();
    if (!text || running) return;
    setRunning(true);
    setResult(null);
    setActiveRunId(null);
    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset: preset.id, input: text }),
      });
      const data = (await res.json()) as TaskRunResult & { error?: string };
      setResult(data);
      // Persist every completed run (ok or agent-failure) — skip only the
      // network-level catch below, which never reached the agent.
      const id = newRunId();
      setHistory(
        addRun({
          id,
          createdAt: Date.now(),
          presetId: preset.id,
          presetLabel: preset.label,
          input: text,
          result: data,
        }),
      );
      setActiveRunId(id);
    } catch {
      setResult({
        ok: false,
        text: "",
        error: "Sunucuya ulaşılamadı.",
        durationMs: 0,
        toolset: preset.toolset,
        newImages: [],
        model: null,
        tokens: null,
        toolCalls: null,
      });
    } finally {
      setRunning(false);
    }
  }

  function openRun(r: StoredRun) {
    setPresetId(r.presetId);
    setInput(r.input);
    setResult(r.result);
    setActiveRunId(r.id);
  }

  function deleteRun(id: string) {
    setHistory(removeRun(id));
    if (activeRunId === id) {
      setActiveRunId(null);
      setResult(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* input-side cost awareness (the reference has none) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
        <Cpu className="h-3.5 w-3.5" />
        <span>
          Görevler <span className="text-muted">{model}</span> ·{" "}
          <span className="text-muted">{provider}</span> üzerinde çalışır
        </span>
        <span className="text-faint">· ajanı çalıştırır, token harcar</span>
      </div>

      {/* preset picker */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TASK_PRESETS.map((p) => {
          const Icon = ICONS[p.icon] ?? Sparkles;
          const active = p.id === preset.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                setPresetId(p.id);
                setResult(null);
              }}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left transition-colors",
                active
                  ? "border-cyan/50 bg-panel text-fg"
                  : "border-edge bg-transparent text-muted hover:bg-panel/50"
              )}
            >
              <Icon
                className={cn("h-4 w-4", active ? "text-cyan" : "text-faint")}
                strokeWidth={1.75}
              />
              <span className="text-sm font-medium">{p.label}</span>
              <span className="text-[0.625rem] leading-tight text-faint">{p.hint}</span>
            </button>
          );
        })}
      </div>

      {/* composer */}
      <div className="panel p-4">
        <div className="flex items-center justify-between">
          <div className="label">{preset.paramLabel}</div>
          <span className="inline-flex items-center gap-1 text-[0.625rem] text-faint">
            <Wrench className="h-3 w-3" />
            {preset.toolset ? `araç: ${preset.toolset}` : "tüm araçlar"}
          </span>
        </div>

        <textarea
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            if (result) setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              go();
            }
          }}
          rows={3}
          placeholder={preset.placeholder}
          className="mt-3 max-h-60 min-h-[4.5rem] w-full resize-y rounded-lg border border-edge bg-transparent px-2.5 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={go}
            disabled={running || !input.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-cyan px-3.5 py-1.5 text-xs font-medium text-bg transition-opacity disabled:opacity-40"
          >
            {running ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Rocket className="h-3.5 w-3.5" />
            )}
            {running ? "Ajan çalışıyor…" : "Çalıştır"}
          </button>
          <span className="text-[0.625rem] text-faint">⌘/Ctrl + Enter</span>
          {preset.expectsArtifact && (
            <span className="ml-auto text-[0.625rem] text-faint">görsel üretir</span>
          )}
        </div>
      </div>

      {/* result */}
      {result && <ResultPanel result={result} />}

      {/* local run history (Astra-local, localStorage) */}
      {history.length > 0 && (
        <div className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <span className="label inline-flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> son çalışmalar
            </span>
            <button
              onClick={() => {
                setHistory(clearRuns());
                setActiveRunId(null);
              }}
              className="text-[0.625rem] text-faint transition-colors hover:text-red"
            >
              temizle
            </button>
          </div>
          <div className="divide-y divide-edge">
            {history.map((r) => {
              const active = r.id === activeRunId;
              const secs = (r.result.durationMs / 1000).toFixed(1);
              return (
                <div
                  key={r.id}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-2.5 transition-colors",
                    active ? "bg-panel-2/60" : "hover:bg-panel-2/40",
                  )}
                >
                  {active && <span className="-ml-4 h-8 w-0.5 shrink-0 rounded-full bg-cyan" />}
                  <button
                    onClick={() => openRun(r)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        r.result.ok ? "bg-green" : "bg-red",
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{r.input}</span>
                      <span className="flex flex-wrap items-center gap-x-2 text-[0.625rem] text-faint">
                        <span className="text-muted">{r.presetLabel}</span>
                        <span>· {secs}s</span>
                        {r.result.tokens != null && <span>· {compactNum(r.result.tokens)} tok</span>}
                        {r.result.newImages.length > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            · <ImgBadge className="h-2.5 w-2.5" />
                            {r.result.newImages.length}
                          </span>
                        )}
                        <span>· {relTime(r.createdAt)}</span>
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => deleteRun(r.id)}
                    title="Sil"
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-faint opacity-0 transition hover:bg-panel-2 hover:text-red group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: TaskRunResult }) {
  const secs = (result.durationMs / 1000).toFixed(1);
  return (
    <div className="panel overflow-hidden">
      {/* observability strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-edge bg-panel-2/30 px-4 py-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              result.ok ? "bg-green" : "bg-red"
            )}
          />
          <span className="font-medium text-fg">{result.ok ? "Tamamlandı" : "Başarısız"}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {secs}s
        </span>
        {result.model && <span className="font-mono text-faint">{result.model}</span>}
        <span className="inline-flex items-center gap-1 text-faint">
          <Wrench className="h-3 w-3" />
          {result.toolset ?? "tüm araçlar"}
        </span>
        {result.tokens != null && <span>{compactNum(result.tokens)} token</span>}
        {result.toolCalls != null && result.toolCalls > 0 && (
          <span>{result.toolCalls} araç çağrısı</span>
        )}
      </div>

      <div className="space-y-4 p-4">
        {result.error && (
          <div className="flex items-start gap-2 text-sm text-red">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{result.error}</span>
          </div>
        )}

        {result.text && (
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-fg">
            {result.text}
          </div>
        )}

        {result.newImages.length > 0 && (
          <div className="space-y-2">
            <div className="label">üretilen görseller</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {result.newImages.map((name) => (
                <a
                  key={name}
                  href={`/api/outputs/image?name=${encodeURIComponent(name)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-lg border border-edge"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/outputs/image?name=${encodeURIComponent(name)}`}
                    alt={name}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                  <div className="truncate px-2 py-1 font-mono text-[0.625rem] text-faint">
                    {name}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {result.ok && !result.text && result.newImages.length === 0 && (
          <div className="text-sm text-faint">Ajan metin döndürmedi.</div>
        )}
      </div>
    </div>
  );
}
