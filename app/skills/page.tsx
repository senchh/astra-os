import { readSkills } from "@/lib/hermes/skills";
import { StatCard } from "@/components/overview/stat-card";
import { relTime } from "@/lib/utils";
import type { Skill } from "@/lib/hermes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function SkillCard({ s }: { s: Skill }) {
  return (
    <div className="panel panel-hover flex flex-col rounded-lg p-3">
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{
            background: s.enabled ? "var(--color-green)" : "var(--color-faint)",
            boxShadow: s.enabled ? "0 0 8px var(--color-green)" : "none",
          }}
          title={s.enabled ? "etkin" : "devre dışı"}
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

      <div className="mt-auto pt-2.5 text-[0.625rem] text-faint">
        {s.useCount > 0 ? (
          <span className="text-muted">
            {s.useCount}× kullanıldı{s.lastUsedAt ? ` · ${relTime(s.lastUsedAt)}` : ""}
          </span>
        ) : (
          <span>hiç kullanılmadı</span>
        )}
        {s.version && <span className="ml-2">v{s.version}</span>}
      </div>
    </div>
  );
}

export default function Page() {
  const cat = readSkills();

  // Observability touch (the reference has none): which skills the agent
  // actually reaches for vs. the long dormant tail.
  const hot = cat.skills
    .filter((s) => s.useCount > 0)
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
        <p className="mt-1 text-sm text-muted">
          Hermes&apos;in yüklü yetenek kataloğu — her biri ihtiyaç anında ajana enjekte edilen bir
          talimat seti. <span className="text-faint">(~/.hermes/skills)</span>
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="toplam skill" value={cat.total} accent="var(--color-cyan)" />
        <StatCard
          label="etkin"
          value={cat.enabled}
          sub={cat.enabled < cat.total ? `${cat.total - cat.enabled} devre dışı` : undefined}
          accent="var(--color-green)"
        />
        <StatCard
          label="kullanımda"
          value={cat.used}
          sub={`${cat.total - cat.used} uykuda`}
          accent={cat.used ? "var(--color-violet)" : "var(--color-faint)"}
        />
        <StatCard label="kategori" value={cat.categories.length} accent="var(--color-amber)" />
      </section>

      {hot.length > 0 && (
        <section className="space-y-2">
          <div className="label px-1">en çok kullanılan</div>
          <div className="flex flex-wrap gap-2">
            {hot.map((s) => (
              <div
                key={s.id}
                className="panel flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
              >
                <span className="text-fg">{s.id}</span>
                <span className="text-violet tabular-nums">{s.useCount}×</span>
                <span className="text-faint">{relTime(s.lastUsedAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {cat.total === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Yüklü skill yok. <span className="text-faint">(~/.hermes/skills)</span>
        </div>
      ) : (
        cat.categories.map((c) => (
          <section key={c.name} className="space-y-2.5">
            <div className="flex items-center gap-2 px-1">
              <span className="text-sm font-medium capitalize text-fg">{c.name}</span>
              <span className="text-xs text-faint">{c.skills.length}</span>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {c.skills.map((s) => (
                <SkillCard key={`${c.name}/${s.id}`} s={s} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
