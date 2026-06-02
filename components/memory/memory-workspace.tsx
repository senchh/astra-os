"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, RotateCcw, Check, NotebookPen, UserRound, Sparkles } from "lucide-react";
import { cn, compactNum, relTime } from "@/lib/utils";
import type { MemoryDoc, MemoryDocId } from "@/lib/hermes/memory";

const ICONS: Record<MemoryDocId, typeof Sparkles> = {
  notes: NotebookPen,
  profile: UserRound,
  soul: Sparkles,
};

// Rough token estimate: ~4 chars/token back-of-envelope for prose.
const estTokens = (t: string) => Math.ceil(t.length / 4);
// §-separated learned facts → entry count.
const entryCount = (t: string) => t.split("§").map((s) => s.trim()).filter(Boolean).length;
// Markdown `##`/`###` outline.
function outline(t: string) {
  const out: { depth: number; title: string }[] = [];
  for (const line of t.split("\n")) {
    const m = /^\s*(#{2,3})\s+(.*\S)\s*$/.exec(line);
    if (m) out.push({ depth: m[1].length, title: m[2] });
  }
  return out;
}

type DocState = { text: string; saved: string; modified: string | null };

export function MemoryWorkspace({ docs }: { docs: MemoryDoc[] }) {
  const [active, setActive] = useState<MemoryDocId>(docs[0]?.id ?? "notes");
  // Per-doc editor state so switching docs preserves unsaved edits.
  const [state, setState] = useState<Record<string, DocState>>(() =>
    Object.fromEntries(
      docs.map((d) => [d.id, { text: d.content, saved: d.content, modified: d.modified }])
    )
  );
  const [pending, setPending] = useState<MemoryDocId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState<MemoryDocId | null>(null);

  const doc = docs.find((d) => d.id === active)!;
  const cur = state[active];
  const dirty = cur.text !== cur.saved;

  const tokens = useMemo(() => estTokens(cur.text), [cur.text]);
  const entries = useMemo(() => entryCount(cur.text), [cur.text]);
  const sections = useMemo(() => outline(cur.text), [cur.text]);
  const lines = useMemo(() => cur.text.split("\n").length, [cur.text]);

  function setText(text: string) {
    setState((s) => ({ ...s, [active]: { ...s[active], text } }));
  }

  async function save() {
    setError(null);
    setPending(active);
    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc: active, content: cur.text }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kaydedilemedi.");
      }
      const now = new Date().toISOString();
      setState((s) => ({ ...s, [active]: { ...s[active], saved: s[active].text, modified: now } }));
      setJustSaved(active);
      setTimeout(() => setJustSaved((j) => (j === active ? null : j)), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending((p) => (p === active ? null : p));
    }
  }

  function revert() {
    setState((s) => ({ ...s, [active]: { ...s[active], text: s[active].saved } }));
    setError(null);
  }

  const isPersona = doc.kind === "persona";
  // Headline stat differs by doc kind: persona → token/call, memory → entry count.
  const headline = isPersona
    ? { label: "~token / çağrı", value: compactNum(tokens), sub: "her agent çağrısına enjekte", color: "var(--color-cyan)" }
    : { label: "kayıt", value: String(entries), sub: "§ ile ayrılmış", color: "var(--color-cyan)" };

  return (
    <div className="grid grid-cols-[200px_1fr] gap-4">
      {/* Sub-nav — the three Personal Memory docs. */}
      <aside className="panel h-fit overflow-hidden">
        <div className="border-b border-edge px-4 py-2.5">
          <span className="label">personal memory</span>
        </div>
        <ul className="p-2">
          {docs.map((d) => {
            const Icon = ICONS[d.id];
            const dDirty = state[d.id].text !== state[d.id].saved;
            return (
              <li key={d.id}>
                <button
                  onClick={() => setActive(d.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    d.id === active ? "bg-panel-2 text-fg" : "text-muted hover:text-fg"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-cyan" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1 truncate">{d.label}</span>
                  {dDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="space-y-4">
        {/* Observability strip — adapts to the active doc's kind. */}
        <section className="grid grid-cols-4 gap-4">
          <div className="panel relative overflow-hidden p-4">
            <span
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ background: headline.color, boxShadow: `0 0 14px ${headline.color}` }}
            />
            <div className="label">{headline.label}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{headline.value}</div>
            <div className="mt-1 text-xs text-faint">{headline.sub}</div>
          </div>
          <div className="panel relative overflow-hidden p-4">
            <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: "var(--color-faint)" }} />
            <div className="label">satır</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">{lines}</div>
          </div>
          <div className="panel relative overflow-hidden p-4">
            <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: "var(--color-faint)" }} />
            <div className="label">{isPersona ? "bölüm" : "kayıt"}</div>
            <div className="mt-2 text-3xl font-semibold tabular-nums">
              {isPersona ? sections.filter((s) => s.depth === 2).length : entries}
            </div>
          </div>
          <div className="panel relative overflow-hidden p-4">
            <span
              className="absolute left-0 top-0 h-full w-[3px]"
              style={{ background: dirty ? "var(--color-amber)" : "var(--color-green)" }}
            />
            <div className="label">durum</div>
            <div className={cn("mt-2 text-lg font-semibold", dirty ? "text-amber" : "text-green")}>
              {dirty ? "kaydedilmedi" : "kayıtlı"}
            </div>
            <div className="mt-1 text-xs text-faint">{cur.modified ? relTime(cur.modified) : "dosya yok"}</div>
          </div>
        </section>

        {error && (
          <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">{error}</div>
        )}

        <div className="panel flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-edge px-4 py-2.5">
            <div className="min-w-0">
              <span className="text-sm text-fg">{doc.label}</span>
              <span className="ml-2 text-xs text-faint">{doc.hint}</span>
            </div>
            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  onClick={revert}
                  disabled={pending === active}
                  className="flex items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted transition-colors hover:text-fg disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Geri al
                </button>
              )}
              <button
                onClick={save}
                disabled={pending === active || !dirty}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                  justSaved === active
                    ? "border-green/60 bg-green/15 text-green"
                    : "border-cyan/60 bg-cyan/15 text-cyan hover:bg-cyan/25"
                )}
              >
                {pending === active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : justSaved === active ? (
                  <Check className="h-3.5 w-3.5" strokeWidth={2} />
                ) : (
                  <Save className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                {justSaved === active ? "Kaydedildi" : "Kaydet"}
              </button>
            </div>
          </div>
          <textarea
            value={cur.text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            className="min-h-[58vh] w-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-fg outline-none placeholder:text-faint"
            placeholder={`${doc.label} henüz boş…`}
          />
        </div>
      </div>
    </div>
  );
}
