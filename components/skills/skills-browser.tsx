"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { cn, relTime } from "@/lib/utils";
import { StatCard } from "@/components/overview/stat-card";
import type { Skill, SkillsCatalog } from "@/lib/hermes/types";

function Switch({ on, pending, onClick }: { on: boolean; pending: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      aria-pressed={on}
      title={on ? "etkin — devre dışı bırak" : "devre dışı — etkinleştir"}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors disabled:opacity-60",
        on ? "border-green/60 bg-green/25" : "border-edge bg-bg-2"
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 grid h-3.5 w-3.5 -translate-y-1/2 place-items-center rounded-full transition-all",
          on ? "left-[1.15rem] bg-green" : "left-0.5 bg-faint"
        )}
        style={on ? { boxShadow: "0 0 8px var(--color-green)" } : undefined}
      >
        {pending && <Loader2 className="h-2.5 w-2.5 animate-spin text-bg" />}
      </span>
    </button>
  );
}

function SkillCard({
  s,
  enabled,
  pending,
  onToggle,
}: {
  s: Skill;
  enabled: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={cn("panel panel-hover flex flex-col rounded-lg p-3", !enabled && "opacity-65")}>
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: enabled ? "var(--color-green)" : "var(--color-faint)",
            boxShadow: enabled ? "0 0 8px var(--color-green)" : "none",
          }}
        />
        <span className="truncate text-sm font-medium text-fg" title={s.id}>
          {s.id}
        </span>
        <span
          className="ml-auto shrink-0 rounded-md border border-edge px-1.5 py-0.5 text-[0.625rem] text-faint"
          title={s.source === "builtin" ? "Hermes ile gelen" : "yerel / kullanıcı"}
        >
          {s.source === "builtin" ? "yerleşik" : "yerel"}
        </span>
      </div>

      {s.description && (
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">{s.description}</p>
      )}

      {s.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.tags.slice(0, 4).map((t) => (
            <span key={t} className="rounded bg-bg-2/60 px-1.5 py-0.5 text-[0.625rem] text-faint">
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-2.5 text-[0.625rem] text-faint">
        {s.useCount > 0 ? (
          <span className="text-muted">
            {s.useCount}× kullanıldı{s.lastUsedAt ? ` · ${relTime(s.lastUsedAt)}` : ""}
          </span>
        ) : (
          <span>hiç kullanılmadı</span>
        )}
        {s.version && <span>v{s.version}</span>}
        <span className="ml-auto">
          <Switch on={enabled} pending={pending} onClick={onToggle} />
        </span>
      </div>
    </div>
  );
}

export function SkillsBrowser({ initial }: { initial: SkillsCatalog }) {
  // Only `enabled` changes on toggle; category/usage structure is static.
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initial.skills.map((s) => [s.id, s.enabled]))
  );
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const enabledCount = useMemo(
    () => Object.values(enabledMap).filter(Boolean).length,
    [enabledMap]
  );

  const hot = useMemo(
    () =>
      initial.skills
        .filter((s) => s.useCount > 0)
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, 6),
    [initial.skills]
  );

  async function toggle(id: string) {
    const next = !enabledMap[id];
    setError(null);
    setPending((p) => new Set(p).add(id));
    setEnabledMap((m) => ({ ...m, [id]: next })); // optimistic

    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enable: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Değişiklik uygulanamadı.");
      }
    } catch (e) {
      setEnabledMap((m) => ({ ...m, [id]: !next })); // revert
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
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="toplam skill" value={initial.total} accent="var(--color-cyan)" />
        <StatCard
          label="etkin"
          value={enabledCount}
          sub={enabledCount < initial.total ? `${initial.total - enabledCount} devre dışı` : undefined}
          accent="var(--color-green)"
        />
        <StatCard
          label="kullanımda"
          value={initial.used}
          sub={`${initial.total - initial.used} uykuda`}
          accent={initial.used ? "var(--color-violet)" : "var(--color-faint)"}
        />
        <StatCard label="kategori" value={initial.categories.length} accent="var(--color-amber)" />
      </section>

      {error && (
        <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
          {error}
        </div>
      )}

      {hot.length > 0 && (
        <section className="space-y-2">
          <div className="label px-1">en çok kullanılan</div>
          <div className="flex flex-wrap gap-2">
            {hot.map((s) => (
              <div key={s.id} className="panel flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-fg">{s.id}</span>
                <span className="text-violet tabular-nums">{s.useCount}×</span>
                <span className="text-faint">{relTime(s.lastUsedAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {initial.categories.map((c) => (
        <section key={c.name} className="space-y-2.5">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium capitalize text-fg">{c.name}</span>
            <span className="text-xs text-faint">{c.skills.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {c.skills.map((s) => (
              <SkillCard
                key={`${c.name}/${s.id}`}
                s={s}
                enabled={enabledMap[s.id] ?? s.enabled}
                pending={pending.has(s.id)}
                onToggle={() => toggle(s.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
