"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Pause, Trash2, Plus, Loader2, X, Pencil } from "lucide-react";
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

export function CronManager({ jobs }: { jobs: CronJob[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Shared create/edit form fields.
  const [schedule, setSchedule] = useState("");
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [deliver, setDeliver] = useState("origin");
  const [saving, setSaving] = useState(false);

  const sorted = [...jobs].sort((a, b) => SORT_ORDER[jobState(a)] - SORT_ORDER[jobState(b)]);

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
    await call({ action, jobId }, jobId);
  }

  function openCreate() {
    setEditingId(null);
    setSchedule("");
    setPrompt("");
    setName("");
    setDeliver("origin");
    setShowForm(true);
  }

  function openEdit(j: CronJob) {
    setEditingId(j.id);
    setSchedule(j.schedule || "");
    setPrompt(j.prompt || "");
    setName(j.name || "");
    setDeliver(j.deliver || "origin");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
  }

  async function submit() {
    if (!schedule.trim() || saving) return;
    setSaving(true);
    const payload = editingId
      ? { action: "edit", jobId: editingId, schedule, prompt, name, deliver }
      : { action: "create", schedule, prompt, name, deliver };
    const ok = await call(payload, editingId ?? "create");
    setSaving(false);
    if (ok) closeForm();
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="label">{jobs.length} iş</div>
        <button
          onClick={() => (showForm ? closeForm() : openCreate())}
          className="inline-flex items-center gap-1.5 rounded-lg border border-edge px-3 py-1.5 text-sm text-fg transition-colors hover:border-cyan/40"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4 text-cyan" />}
          {showForm ? "İptal" : "Yeni iş"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
          {error}
        </div>
      )}

      {showForm && (
        <div className="panel space-y-3 p-4">
          <div className="flex items-center gap-2">
            <span className="label">{editingId ? "işi düzenle" : "yeni iş"}</span>
            {editingId && (
              <span className="font-mono text-xs text-faint">{editingId}</span>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="label">zamanlama *</span>
              <input
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                placeholder="30m · every 2h · 0 9 * * *"
                className="w-full rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
              />
            </label>
            <label className="space-y-1">
              <span className="label">isim</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="(opsiyonel)"
                className="w-full rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
              />
            </label>
          </div>
          <label className="block space-y-1">
            <span className="label">görev / prompt</span>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Ajanın her çalıştığında yapacağı iş…"
              className="w-full resize-none rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
            />
          </label>
          <div className="flex items-center gap-3">
            <label className="space-y-1">
              <span className="label">teslimat</span>
              <select
                value={deliver}
                onChange={(e) => setDeliver(e.target.value)}
                className="rounded-lg border border-edge bg-bg-2 px-3 py-2 text-sm text-fg outline-none focus:border-cyan/40"
              >
                {DELIVER_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={submit}
              disabled={!schedule.trim() || saving}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-sm font-medium text-bg transition-opacity disabled:opacity-40"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Kaydet" : "Oluştur"}
            </button>
          </div>
        </div>
      )}

      <section className="panel divide-y divide-edge overflow-hidden">
        {sorted.length === 0 && (
          <div className="p-8 text-center text-sm text-muted">
            Cron işi yok. <span className="text-faint">Yukarıdan yeni bir tane oluştur.</span>
          </div>
        )}
        {sorted.map((j) => {
          const s = jobState(j);
          const meta = STATE_META[s];
          const busy = pending.has(j.id);
          return (
            <div key={j.id} className="px-4 py-3.5 transition-colors hover:bg-panel-2/50">
              <div className="flex items-center gap-3">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                  {j.name}
                </span>
                <span
                  className="shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider"
                  style={{ color: meta.color, borderColor: meta.color }}
                >
                  {meta.label}
                </span>

                <div className="flex shrink-0 items-center gap-1">
                  {busy ? (
                    <Loader2 className="mx-1.5 h-4 w-4 animate-spin text-cyan" />
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(j)}
                        title="Düzenle"
                        className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-panel-2 hover:text-cyan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => lifecycle("run", j.id)}
                        title="Şimdi çalıştır"
                        className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-panel-2 hover:text-green"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => lifecycle(j.enabled ? "pause" : "resume", j.id)}
                        title={j.enabled ? "Duraklat" : "Devam ettir"}
                        className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-panel-2 hover:text-amber"
                      >
                        {j.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={() => lifecycle("remove", j.id)}
                        title="Sil"
                        className="grid h-7 w-7 place-items-center rounded-md text-faint hover:bg-panel-2 hover:text-red"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 pl-5 text-xs text-muted">
                <span className="font-mono text-faint">{j.scheduleDisplay}</span>
                <span>
                  {j.model}
                  <span className="text-faint"> · {j.provider}</span>
                </span>
                {j.lastRunAt && <span>son: {relTime(j.lastRunAt)}</span>}
                {j.nextRunAt && <span>sıradaki: {relTime(j.nextRunAt)}</span>}
              </div>

              {j.lastError && (
                <div className="mt-1.5 truncate pl-5 text-xs text-red" title={j.lastError}>
                  {j.lastError}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
