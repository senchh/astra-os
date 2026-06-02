"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SETTING_FIELDS,
  type SettingField,
  type SettingValue,
} from "@/lib/hermes/settings-fields";
import type { Settings } from "@/lib/hermes/settings";

function Switch({ on, pending, onClick }: { on: boolean; pending: boolean; onClick: () => void }) {
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

const GROUPS = ["Davranış", "Görünüm"] as const;

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [values, setValues] = useState<Record<string, SettingValue | null>>(settings.values);
  const [pending, setPending] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function apply(field: SettingField, next: SettingValue) {
    const prev = values[field.key];
    if (next === prev) return;

    setError(null);
    setPending(field.key);
    setValues((v) => ({ ...v, [field.key]: next })); // optimistic

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: field.key, value: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Uygulanamadı.");
      }
      setSaved(field.key);
      setTimeout(() => setSaved((s) => (s === field.key ? null : s)), 1800);
    } catch (e) {
      setValues((v) => ({ ...v, [field.key]: prev })); // revert
      setError(`${field.label}: ${(e as Error).message}`);
    } finally {
      setPending((p) => (p === field.key ? null : p));
    }
  }

  function Control({ field }: { field: SettingField }) {
    const val = values[field.key];
    const isPending = pending === field.key;

    if (field.kind === "bool") {
      return <Switch on={val === true} pending={isPending} onClick={() => apply(field, !(val === true))} />;
    }

    if (field.kind === "enum" && field.options) {
      // ≤5 options → segmented buttons; more → select.
      if (field.options.length <= 5) {
        return (
          <div className="flex gap-1">
            {field.options.map((opt) => (
              <button
                key={opt}
                disabled={isPending}
                onClick={() => apply(field, opt)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors disabled:opacity-60",
                  val === opt
                    ? "border-cyan/60 bg-cyan/15 text-cyan"
                    : "border-edge text-muted hover:text-fg"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        );
      }
      return (
        <select
          value={typeof val === "string" ? val : ""}
          disabled={isPending}
          onChange={(e) => apply(field, e.target.value)}
          className="rounded-md border border-edge bg-bg-2 px-2.5 py-1.5 text-xs text-fg outline-none disabled:opacity-60"
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    // number
    return (
      <input
        type="number"
        defaultValue={typeof val === "number" ? val : ""}
        min={field.min}
        max={field.max}
        disabled={isPending}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) apply(field, n);
        }}
        className="w-24 rounded-md border border-edge bg-bg-2 px-2.5 py-1.5 text-right text-xs tabular-nums text-fg outline-none disabled:opacity-60"
      />
    );
  }

  return (
    <>
      {/* Observability touch — these settings drive the latency/cost shown in Control Room. */}
      <div className="panel flex items-center justify-between p-4">
        <div>
          <div className="label">uygulanan model</div>
          <div className="mt-1 font-mono text-sm text-fg">
            {settings.model?.default || "—"}
            {settings.model?.provider && (
              <span className="ml-2 text-faint">· {settings.model.provider}</span>
            )}
          </div>
        </div>
        <p className="max-w-xs text-right text-xs text-faint">
          Reasoning &amp; max-turns, Control Room&apos;daki p50 gecikme ve token maliyetini
          doğrudan etkiler.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
          {error}
        </div>
      )}

      {GROUPS.map((group) => {
        const fields = SETTING_FIELDS.filter((f) => f.group === group);
        return (
          <section key={group} className="panel overflow-hidden">
            <div className="border-b border-edge px-4 py-2.5">
              <span className="label">{group}</span>
            </div>
            <div className="divide-y divide-edge">
              {fields.map((field) => (
                <div key={field.key} className="flex items-center gap-4 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-fg">
                      {field.label}
                      {saved === field.key && (
                        <span className="flex items-center gap-0.5 text-xs text-green">
                          <Check className="h-3 w-3" strokeWidth={2.5} /> kaydedildi
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-faint">{field.hint}</div>
                  </div>
                  <Control field={field} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
