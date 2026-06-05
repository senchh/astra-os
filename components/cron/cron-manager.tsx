"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Play, Pause, Trash2, Plus, Loader2, X, Pencil, ArrowUpRight } from "lucide-react";
import { relTime } from "@/lib/utils";
import type { CronJob } from "@/lib/hermes/types";

type JobState = "ok" | "error" | "paused" | "pending";

function jobState(j: CronJob): JobState {
  if (!j.enabled) return "paused";
  if (j.lastStatus === "error") return "error";
  if (j.lastStatus === "ok") return "ok";
  return "pending";
}

const STATE_META: Record<JobState, { label: string; color: string }> = {
  ok: { label: "OK", color: "var(--color-green)" },
  error: { label: "HATA", color: "var(--color-red)" },
  paused: { label: "DURAKLADI", color: "var(--color-faint)" },
  pending: { label: "BEKLİYOR", color: "var(--color-amber)" },
};

const SORT_ORDER: Record<JobState, number> = { error: 0, ok: 1, pending: 2, paused: 3 };

const DELIVER_OPTIONS = ["origin", "local", "all", "telegram", "discord", "signal"];

type Mode = "view" | "edit" | "create";

export function CronManager({ jobs }: { jobs: CronJob[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => [...jobs].sort((a, b) => SORT_ORDER[jobState(a)] - SORT_ORDER[jobState(b)])[0]?.id ?? null,
  );
  const [mode, setMode] = useState<Mode>("view");

  // Shared create/edit form fields.
  const [schedule, setSchedule] = useState("");
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [deliver, setDeliver] = useState("origin");
  const [saving, setSaving] = useState(false);

  const sorted = [...jobs].sort((a, b) => SORT_ORDER[jobState(a)] - SORT_ORDER[jobState(b)]);
  const selected = jobs.find((j) => j.id === selectedId) ?? null;
  const editing = mode === "edit" || mode === "create";

  const mark = (key: string, on: boolean) =>
    setPending((p) => {
      const n = new Set(p);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });

  async function call(payload: Record<string, unknown>, key: string): Promise<boolean> {
    setError(null);
    mark(key, true);
    try {
      const res = await fetch("/api/cron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "İşlem başarısız.");
      }
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      mark(key, false);
    }
  }

  async function lifecycle(action: string, jobId: string) {
    if (action === "remove" && !confirm("Bu cron işi silinsin mi?")) return;
    const ok = await call({ action, jobId }, jobId);
    if (ok && action === "remove" && selectedId === jobId) {
      setSelectedId(null);
      setMode("view");
    }
  }

  function startCreate() {
    setSchedule("");
    setPrompt("");
    setName("");
    setDeliver("origin");
    setMode("create");
    setError(null);
  }

  function startEdit(j: CronJob) {
    setSelectedId(j.id);
    setSchedule(j.schedule || "");
    setPrompt(j.prompt || "");
    setName(j.name || "");
    setDeliver(j.deliver || "origin");
    setMode("edit");
    setError(null);
  }

  function selectJob(j: CronJob) {
    setSelectedId(j.id);
    setMode("view");
    setError(null);
  }

  async function submit() {
    if (!schedule.trim() || saving) return;
    setSaving(true);
    const payload =
      mode === "edit" && selectedId
        ? { action: "edit", jobId: selectedId, schedule, prompt, name, deliver }
        : { action: "create", schedule, prompt, name, deliver };
    const ok = await call(payload, mode === "edit" && selectedId ? selectedId : "create");
    setSaving(false);
    if (ok) setMode("view");
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* ── Master: job list ───────────────────────────────────────────── */}
      <div className="panel self-start overflow-hidden">
        <div className="flex items-center justify-between border-b border-edge px-3.5 py-2.5">
          <span className="label">{jobs.length} iş</span>
          <button
            onClick={startCreate}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
              mode === "create"
                ? "border-cyan/50 bg-cyan/10 text-fg"
                : "border-edge text-muted hover:border-cyan/40 hover:text-fg"
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-cyan" />
            Yeni
          </button>
        </div>

        {sorted.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted">
            Cron işi yok. <span className="text-faint">&quot;Yeni&quot; ile oluştur.</span>
          </div>
        ) : (
          <div className="max-h-[60vh] divide-y divide-edge overflow-y-auto">
            {sorted.map((j) => {
              const meta = STATE_META[jobState(j)];
              const active = j.id === selectedId && mode !== "create";
              const busy = pending.has(j.id);
              return (
                <button
                  key={j.id}
                  onClick={() => selectJob(j)}
                  className={`relative flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors ${
                    active ? "bg-panel-2/70" : "hover:bg-panel-2/40"
                  }`}
                >
                  {active && <span className="absolute left-0 top-0 h-full w-0.5 bg-cyan" />}
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{j.name}</span>
                    <span className="block truncate font-mono text-[0.625rem] text-faint">
                      {j.scheduleDisplay}
                    </span>
                  </span>
                  {busy ? (
                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-cyan" />
                  ) : (
                    <span
                      className="shrink-0 text-[0.625rem] font-semibold tracking-wider"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Detail: view / edit / create / empty ───────────────────────── */}
      <div className="min-w-0 space-y-4">
        {error && (
          <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
            {error}
          </div>
        )}

        {editing ? (
          <JobForm
            mode={mode}
            jobId={selectedId}
            schedule={schedule}
            setSchedule={setSchedule}
            prompt={prompt}
            setPrompt={setPrompt}
            name={name}
            setName={setName}
            deliver={deliver}
            setDeliver={setDeliver}
            saving={saving}
            onSubmit={submit}
            onCancel={() => setMode("view")}
          />
        ) : selected ? (
          <JobDetail
            job={selected}
            busy={pending.has(selected.id)}
            onEdit={() => startEdit(selected)}
            onLifecycle={lifecycle}
          />
        ) : (
          <div className="panel flex min-h-[16rem] flex-col items-center justify-center gap-2 p-8 text-center">
            <p className="text-sm text-muted">Detayını görmek için soldan bir iş seç.</p>
            <p className="text-xs text-faint">ya da &quot;Yeni&quot; ile bir tane oluştur.</p>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Detail (read view + actions) ──────────────────────────────────────────
function JobDetail({
  job,
  busy,
  onEdit,
  onLifecycle,
}: {
  job: CronJob;
  busy: boolean;
  onEdit: () => void;
  onLifecycle: (action: string, jobId: string) => void;
}) {
  const meta = STATE_META[jobState(job)];
  return (
    <div className="panel overflow-hidden">
      {/* header */}
      <div className="flex items-center gap-2.5 border-b border-edge px-5 py-4">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
        />
        <h2 className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-tight text-fg">
          {job.name}
        </h2>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider"
          style={{ color: meta.color, borderColor: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      {/* actions */}
      <div className="flex flex-wrap items-center gap-2 border-b border-edge px-5 py-3">
        {busy ? (
          <span className="inline-flex items-center gap-2 text-sm text-cyan">
            <Loader2 className="h-4 w-4 animate-spin" /> işleniyor…
          </span>
        ) : (
          <>
            <button
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:border-cyan/40 hover:text-cyan"
            >
              <Pencil className="h-3.5 w-3.5" /> Düzenle
            </button>
            <button
              onClick={() => onLifecycle("run", job.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:border-green/40 hover:text-green"
            >
              <Play className="h-3.5 w-3.5" /> Şimdi çalıştır
            </button>
            <button
              onClick={() => onLifecycle(job.enabled ? "pause" : "resume", job.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:border-amber/40 hover:text-amber"
            >
              {job.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {job.enabled ? "Duraklat" : "Devam ettir"}
            </button>
            <button
              onClick={() => onLifecycle("remove", job.id)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm text-muted transition-colors hover:border-red/40 hover:text-red"
            >
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
          </>
        )}
      </div>

      {/* facts */}
      <dl className="grid grid-cols-2 gap-x-5 gap-y-3.5 px-5 py-4 sm:grid-cols-3">
        <Fact label="zamanlama">
          <span className="font-mono text-cyan">{job.scheduleDisplay}</span>
          {job.schedule && job.schedule !== job.scheduleDisplay && (
            <span className="block font-mono text-[0.625rem] text-faint">{job.schedule}</span>
          )}
        </Fact>
        <Fact label="model">
          {job.model}
          <span className="block text-[0.625rem] text-faint">{job.provider}</span>
        </Fact>
        <Fact label="teslimat">{job.deliver || "—"}</Fact>
        <Fact label="sıradaki">{job.nextRunAt ? relTime(job.nextRunAt) : "—"}</Fact>
        <Fact label="son çalışma">{job.lastRunAt ? relTime(job.lastRunAt) : "—"}</Fact>
        <Fact label="profil">{job.profile || "default"}</Fact>
      </dl>

      {/* prompt */}
      <div className="border-t border-edge px-5 py-4">
        <div className="label mb-2">görev / prompt</div>
        {job.prompt ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{job.prompt}</p>
        ) : (
          <p className="text-sm text-faint">—</p>
        )}
      </div>

      {/* last error + outputs link */}
      {job.lastError && (
        <div className="border-t border-red/20 bg-red/5 px-5 py-3 text-xs text-red">
          <span className="font-semibold">son hata:</span> {job.lastError}
        </div>
      )}
      <div className="border-t border-edge px-5 py-3">
        <Link
          href="/sessions?source=cron"
          className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-cyan"
        >
          son çıktılar — Sessions&apos;ta ara <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="label">{label}</dt>
      <dd className="mt-1 truncate text-sm text-fg">{children}</dd>
    </div>
  );
}

// ── Form (create / edit) ──────────────────────────────────────────────────
function JobForm({
  mode,
  jobId,
  schedule,
  setSchedule,
  prompt,
  setPrompt,
  name,
  setName,
  deliver,
  setDeliver,
  saving,
  onSubmit,
  onCancel,
}: {
  mode: Mode;
  jobId: string | null;
  schedule: string;
  setSchedule: (v: string) => void;
  prompt: string;
  setPrompt: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  deliver: string;
  setDeliver: (v: string) => void;
  saving: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const isEdit = mode === "edit";
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2 border-b border-edge px-5 py-3.5">
        <span className="font-display text-base font-semibold tracking-tight text-fg">
          {isEdit ? "İşi düzenle" : "Yeni iş"}
        </span>
        {isEdit && jobId && <span className="font-mono text-xs text-faint">{jobId}</span>}
        <button
          onClick={onCancel}
          className="ml-auto grid h-7 w-7 place-items-center rounded-md text-faint transition-colors hover:bg-panel-2 hover:text-fg"
          title="İptal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3.5 p-5">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="space-y-1.5">
            <span className="label">zamanlama *</span>
            <input
              value={schedule}
              onChange={(e) => setSchedule(e.target.value)}
              placeholder="30m · every 2h · 0 9 * * *"
              className="w-full rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
            />
          </label>
          <label className="space-y-1.5">
            <span className="label">isim</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="(opsiyonel)"
              className="w-full rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
            />
          </label>
        </div>
        <label className="block space-y-1.5">
          <span className="label">görev / prompt</span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={14}
            placeholder="Ajanın her çalıştığında yapacağı iş…"
            className="min-h-[22rem] w-full resize-y rounded-lg border border-edge bg-bg-2 px-3 py-2.5 font-mono text-[13px] leading-relaxed text-fg outline-none placeholder:text-faint focus:border-cyan/40"
          />
        </label>
        <div className="flex items-center gap-3">
          <label className="space-y-1.5">
            <span className="label">teslimat</span>
            <select
              value={deliver}
              onChange={(e) => setDeliver(e.target.value)}
              className="block rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none focus:border-cyan/40"
            >
              {DELIVER_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={onSubmit}
            disabled={!schedule.trim() || saving}
            className="ml-auto inline-flex items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEdit ? "Kaydet" : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
