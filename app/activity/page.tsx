import { summarizeActivity, readRuns, readSourceUsage } from "@/lib/hermes/sessions";
import { readImages } from "@/lib/hermes/outputs";
import { StatCard } from "@/components/overview/stat-card";
import { compactNum, relTime, cn } from "@/lib/utils";
import type { Run } from "@/lib/hermes/types";

const fmtKb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === "running") return "var(--color-cyan)";
  if (/error|fail|exhaust/.test(s)) return "var(--color-red)";
  if (/complete|stop|end_turn|done/.test(s)) return "var(--color-green)";
  return "var(--color-faint)";
}

function fmtDur(sec: number | null): string {
  if (sec == null) return "—";
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m}d ${r}s` : `${m}d`;
}

function RunRow({ r }: { r: Run }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-5 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto_auto_auto]">
      {/* run (title or id) */}
      <div className="min-w-0">
        <div className="truncate text-sm text-fg">{r.title || r.id}</div>
        <div className="font-mono text-[0.625rem] text-faint">{r.id.slice(0, 18)}</div>
      </div>
      {/* model + source */}
      <div className="hidden min-w-0 sm:block">
        <div className="truncate font-mono text-xs text-muted">{r.model}</div>
        <div className="text-[0.625rem] text-faint">{r.source}</div>
      </div>
      {/* duration */}
      <div className="hidden text-right text-xs tabular-nums text-muted sm:block">
        {fmtDur(r.durationSec)}
      </div>
      {/* status */}
      <div className="hidden items-center justify-end gap-1.5 sm:flex">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor(r.status) }} />
        <span className="text-[0.625rem] uppercase tracking-wider text-faint">{r.status}</span>
      </div>
      {/* tokens */}
      <div className="text-right text-xs tabular-nums text-fg">
        {compactNum(r.totalTokens)}
        <span className="text-faint"> tok</span>
      </div>
      {/* cost */}
      <div
        className={cn(
          "text-right text-xs tabular-nums",
          r.costLabel.startsWith("$") ? "text-amber" : "text-faint"
        )}
      >
        {r.costLabel}
      </div>
    </div>
  );
}

export default function Page() {
  const a = summarizeActivity(14);
  const runs = readRuns(40);
  const sources = readSourceUsage();
  const images = readImages();
  const maxSessions = Math.max(1, ...a.days.map((d) => d.sessions));
  const maxModelSessions = Math.max(1, ...a.models.map((m) => m.sessions));
  const sourceMax = Math.max(1, ...sources.map((s) => s.tokens));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-muted">
          Her run, token muhasebesi ve model dağılımı —{" "}
          <code className="font-mono text-cyan">state.db</code> üzerinden.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="toplam run" value={a.totalSessions} accent="var(--color-cyan)" />
        <StatCard
          label="toplam mesaj"
          value={a.totalMessages.toLocaleString("tr-TR")}
          accent="var(--color-green)"
        />
        <StatCard label="toplam token" value={compactNum(a.totalTokens)} accent="var(--color-violet)" />
        <StatCard label="son aktivite" value={relTime(a.lastActivity)} accent="var(--color-amber)" />
      </section>

      {/* Per-source token usage */}
      {sources.length > 0 && (
        <section className="panel p-5">
          <div className="label">kaynak · token</div>
          <div className="mt-4 space-y-3">
            {sources.map((s) => (
              <div key={s.source} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-fg">{s.source}</span>
                  <span className="tabular-nums text-muted">
                    {compactNum(s.tokens)} tok
                    <span className="text-faint"> · {s.runs} run</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-2">
                  <div
                    className="h-full rounded-full bg-cyan"
                    style={{ width: `${(s.tokens / sourceMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Runs table */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge px-5 py-3">
          <span className="label">son run&apos;lar</span>
          <span className="text-xs text-faint">en yeni {runs.length}</span>
        </div>
        {runs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            Run verisi yok. <span className="text-faint">(state.db)</span>
          </div>
        ) : (
          <div className="divide-y divide-edge">
            {runs.map((r) => (
              <RunRow key={r.id} r={r} />
            ))}
          </div>
        )}
        <div className="border-t border-edge px-5 py-2 text-[0.625rem] text-faint">
          Maliyet: OAuth/abonelik sağlayıcılarda token başına ücret raporlanmaz → &quot;abonelik&quot; / &quot;—&quot;.
        </div>
      </section>

      {/* Outputs — generated images */}
      <section className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge px-5 py-3">
          <span className="label">üretilen görseller</span>
          <span className="text-xs text-faint">{images.length}</span>
        </div>
        {images.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">
            Henüz üretilmiş görsel yok.{" "}
            <span className="text-faint">
              (ajan image_gen/vision çalıştırınca <code className="font-mono">~/.hermes/images</code>&apos;e düşer)
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <a
                key={img.name}
                href={`/api/outputs/image?name=${encodeURIComponent(img.name)}`}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-xl border border-edge bg-bg-2 transition-colors hover:border-cyan/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/outputs/image?name=${encodeURIComponent(img.name)}`}
                  alt={img.name}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <div className="px-3 py-2">
                  <div className="truncate font-mono text-[0.625rem] text-muted" title={img.name}>
                    {img.name}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[0.625rem] text-faint">
                    <span>{relTime(img.modified)}</span>
                    <span className="tabular-nums">{fmtKb(img.bytes)}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Runs per day */}
      <section className="panel p-5">
        <div className="label">run · gün</div>
        <div className="mt-5 flex h-40 items-end gap-1.5">
          {a.days.map((d) => {
            const h = (d.sessions / maxSessions) * 100;
            return (
              <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1.5">
                <span className="text-[0.625rem] tabular-nums text-faint opacity-0 transition-opacity group-hover:opacity-100">
                  {d.sessions}
                </span>
                <div
                  className="w-full rounded-t bg-cyan/70 transition-colors group-hover:bg-cyan"
                  style={{ height: `${Math.max(h, d.sessions ? 4 : 0)}%`, minHeight: d.sessions ? 3 : 0 }}
                  title={`${d.date}: ${d.sessions} run · ${d.messages} mesaj`}
                />
                <span className="text-[0.625rem] tabular-nums text-faint">{d.date.slice(8, 10)}</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Models */}
      <section className="panel overflow-hidden">
        <div className="border-b border-edge px-5 py-3">
          <span className="label">model dağılımı</span>
        </div>
        <div className="divide-y divide-edge">
          {a.models.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">Run verisi yok.</div>
          )}
          {a.models.map((m) => {
            const pct = (m.sessions / maxModelSessions) * 100;
            return (
              <div key={m.model} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-fg">
                    {m.model}
                    {m.provider !== "unknown" && <span className="text-faint"> · {m.provider}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted">
                    {m.sessions} run
                    <span className="text-faint"> · {compactNum(m.tokens)} tok</span>
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg-2">
                  <div className="h-full rounded-full bg-violet" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
