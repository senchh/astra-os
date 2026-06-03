"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Loader2, Sparkles, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentOption, CredStatus } from "@/lib/hermes/types";
import {
  loadAll,
  upsert,
  remove,
  rename,
  deriveTitle,
  newId,
  type Conversation,
} from "@/lib/chat-history";

interface Msg {
  role: "user" | "assistant";
  content: string;
  agent?: string; // which agent produced this answer (provenance)
}

interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost?: number;
}

const STATUS_COLOR: Record<CredStatus, string> = {
  ok: "var(--color-green)",
  exhausted: "var(--color-amber)",
  error: "var(--color-red)",
  unknown: "var(--color-faint)",
};

function relTime(ts: number): string {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return "az önce";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} dk`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} sa`;
  return `${Math.floor(h / 24)} g`;
}

export default function ChatClient({ agents }: { agents: AgentOption[] }) {
  const defaultAgent = agents.find((a) => a.isDefault) ?? agents[0] ?? null;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);
  const [tool, setTool] = useState<string | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [source, setSource] = useState<"api" | "cli" | null>(null);

  // Per-agent selection.
  const [selProvider, setSelProvider] = useState<string | null>(defaultAgent?.provider ?? null);
  const [selModel, setSelModel] = useState<string>(defaultAgent?.defaultModel ?? "");

  // History (localStorage).
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>(() => newId());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const createdAtRef = useRef<number>(Date.now());
  const titleRef = useRef<string>("");
  const renamedRef = useRef<boolean>(false);

  const selAgent = agents.find((a) => a.provider === selProvider) ?? null;
  // No override when sitting on the default agent with its sticky model.
  const isOverride = Boolean(
    selAgent && !(selAgent.isDefault && selModel === selAgent.defaultModel)
  );
  const activeLabel = selAgent ? selAgent.label : "Hermes";

  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function resetAgent() {
    setSelProvider(defaultAgent?.provider ?? null);
    setSelModel(defaultAgent?.defaultModel ?? "");
  }

  function pickAgent(a: AgentOption) {
    setSelProvider(a.provider);
    setSelModel(a.defaultModel);
  }

  // Load the saved conversation list once, on mount (client only). Deferred out
  // of the effect body to avoid the cascading-render lint (same as the speech effect).
  useEffect(() => {
    const raf = requestAnimationFrame(() => setConversations(loadAll()));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Persist the active conversation after each completed turn (and on agent
  // change). Guarded on !loading so we don't write to storage on every token.
  useEffect(() => {
    if (loading || messages.length === 0) return;
    const conv: Conversation = {
      id: activeId,
      title: renamedRef.current ? titleRef.current : deriveTitle(messages),
      renamed: renamedRef.current,
      createdAt: createdAtRef.current,
      updatedAt: Date.now(),
      provider: selProvider,
      model: selModel,
      messages,
    };
    setConversations(upsert(conv));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, messages, selProvider, selModel]);

  function newChat() {
    if (loading) return;
    setMessages([]);
    setActiveId(newId());
    createdAtRef.current = Date.now();
    titleRef.current = "";
    renamedRef.current = false;
    resetAgent();
    setError(null);
    setUsage(null);
    setTool(null);
    setRenamingId(null);
  }

  function loadChat(c: Conversation) {
    if (loading) return;
    setMessages(c.messages);
    setActiveId(c.id);
    createdAtRef.current = c.createdAt;
    titleRef.current = c.title;
    renamedRef.current = Boolean(c.renamed);
    // Restore the agent if it's still authed; otherwise fall back to default.
    const a = agents.find((x) => x.provider === c.provider);
    if (a) {
      setSelProvider(a.provider);
      setSelModel(a.models.includes(c.model) ? c.model : a.defaultModel);
    } else {
      resetAgent();
    }
    setError(null);
    setUsage(null);
    setTool(null);
    setRenamingId(null);
  }

  function deleteChat(id: string) {
    const left = remove(id);
    setConversations(left);
    if (id === activeId) newChat();
  }

  function commitRename(id: string) {
    const t = draftTitle.trim();
    if (t) {
      setConversations(rename(id, t));
      if (id === activeId) {
        titleRef.current = t;
        renamedRef.current = true;
      }
    }
    setRenamingId(null);
  }

  // Set up Web Speech API (Chrome/Edge). Dictates straight into the input.
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const raf = requestAnimationFrame(() => setSpeechOk(true));

    const rec = new SR();
    rec.lang = "tr-TR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let transcript = "";
      for (let i = 0; i < e.results.length; i++) {
        transcript += e.results[i][0].transcript;
      }
      const base = baseInputRef.current;
      setInput((base ? base + " " : "") + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);

    recognitionRef.current = rec;
    return () => {
      cancelAnimationFrame(raf);
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  function toggleMic() {
    const rec = recognitionRef.current;
    if (!rec) return;
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      baseInputRef.current = input.trim();
      try {
        rec.start();
        setListening(true);
      } catch {
        /* already started */
      }
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    }

    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    baseInputRef.current = "";
    setError(null);
    setTool(null);
    setUsage(null);
    setLoading(true);

    const answeringAgent = activeLabel;

    let assistantStarted = false;
    const startAssistant = () => {
      if (assistantStarted) return;
      assistantStarted = true;
      setMessages((m) => [...m, { role: "assistant", content: "", agent: answeringAgent }]);
    };
    const appendChunk = (t: string) => {
      startAssistant();
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          ...copy[copy.length - 1],
          role: "assistant",
          content: copy[copy.length - 1].content + t,
        };
        return copy;
      });
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next,
          sessionId: activeId,
          ...(isOverride && selAgent
            ? { provider: selAgent.provider, model: selModel }
            : {}),
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Bir hata oluştu.";
        try {
          msg = (await res.json()).error ?? msg;
        } catch {
          /* non-JSON */
        }
        setError(msg);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const handle = (event: string, data: string) => {
        let payload: unknown = data;
        try {
          payload = JSON.parse(data);
        } catch {
          /* plain string */
        }
        if (event === "meta") setSource((payload as any)?.source ?? null);
        else if (event === "chunk") {
          setTool(null);
          appendChunk(typeof payload === "string" ? payload : String(payload));
        } else if (event === "tool") setTool(String(payload));
        else if (event === "usage") setUsage(payload as Usage);
        else if (event === "error") setError(String(payload));
      };

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";
        for (const block of blocks) {
          let ev = "message";
          let dataLine = "";
          for (const line of block.split("\n")) {
            if (line.startsWith("event:")) ev = line.slice(6).trim();
            else if (line.startsWith("data:")) dataLine = line.slice(5).replace(/^\s/, "");
          }
          if (dataLine) handle(ev, dataLine);
        }
      }
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setTool(null);
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function labelOf(provider: string | null): string {
    return agents.find((a) => a.provider === provider)?.label ?? "Hermes";
  }

  return (
    <div className="flex h-full">
      {/* History rail */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-edge md:flex">
        <div className="flex items-center justify-between px-3 py-3">
          <span className="label">Sohbetler</span>
          <button
            onClick={newChat}
            disabled={loading}
            title="Yeni sohbet"
            className="grid h-7 w-7 place-items-center rounded-lg border border-edge text-muted transition-colors hover:border-cyan/40 hover:text-fg disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-faint">
              Henüz kayıtlı sohbet yok.
            </p>
          )}

          {conversations.map((c) => {
            const active = c.id === activeId;
            return (
              <div
                key={c.id}
                className={cn(
                  "group relative rounded-lg px-2.5 py-2 transition-colors",
                  active ? "bg-cyan/10" : "hover:bg-white/5"
                )}
              >
                {renamingId === c.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename(c.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="min-w-0 flex-1 rounded border border-cyan/40 bg-transparent px-1.5 py-0.5 text-xs text-fg outline-none"
                    />
                    <button
                      onClick={() => commitRename(c.id)}
                      className="grid h-5 w-5 place-items-center text-green"
                      title="Kaydet"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setRenamingId(null)}
                      className="grid h-5 w-5 place-items-center text-faint hover:text-fg"
                      title="İptal"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => loadChat(c)}
                      className="block w-full text-left"
                    >
                      <div
                        className={cn(
                          "truncate pr-10 text-xs",
                          active ? "text-fg" : "text-muted group-hover:text-fg"
                        )}
                      >
                        {c.title}
                      </div>
                      <div className="mt-0.5 truncate text-[0.625rem] text-faint">
                        {relTime(c.updatedAt)} · {labelOf(c.provider)}
                      </div>
                    </button>
                    <div className="absolute right-1.5 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => {
                          setRenamingId(c.id);
                          setDraftTitle(c.title);
                        }}
                        title="Yeniden adlandır"
                        className="grid h-6 w-6 place-items-center rounded text-faint hover:text-fg"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => deleteChat(c.id)}
                        title="Sil"
                        className="grid h-6 w-6 place-items-center rounded text-faint hover:text-red"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Chat column */}
      <div className="mx-auto flex h-full max-w-3xl flex-1 flex-col p-6">
        <header className="shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Hermes</h1>
              <p className="mt-1 text-sm text-muted">
                Ajanınla canlı sohbet — yaz ya da mikrofonla konuş.
              </p>
            </div>
            <button
              onClick={newChat}
              disabled={loading}
              title="Yeni sohbet"
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-edge px-2.5 py-1.5 text-xs text-muted transition-colors hover:border-cyan/40 hover:text-fg disabled:opacity-40 md:hidden"
            >
              <Plus className="h-3.5 w-3.5" /> Yeni
            </button>
          </div>

          {/* Agent pills — the health dot is the observability touch the reference
              lacks: you pick an agent while seeing whether its keys can answer. */}
          {agents.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {agents.map((a) => {
                const active = a.provider === selProvider;
                return (
                  <button
                    key={a.provider}
                    onClick={() => pickAgent(a)}
                    title={
                      a.status === "exhausted"
                        ? `${a.label} — anahtar tükendi`
                        : a.status === "error"
                          ? `${a.label} — anahtar hatası`
                          : a.label
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
                      active
                        ? "border-cyan/50 bg-cyan/15 text-fg"
                        : "border-edge text-muted hover:border-cyan/30 hover:text-fg"
                    )}
                  >
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: STATUS_COLOR[a.status] }}
                    />
                    {a.label}
                    {a.isDefault && (
                      <span className="text-[0.625rem] uppercase tracking-wide text-faint">
                        varsayılan
                      </span>
                    )}
                  </button>
                );
              })}

              {selAgent && selAgent.models.length > 1 && (
                <select
                  value={selModel}
                  onChange={(e) => setSelModel(e.target.value)}
                  title="Bu ajan için model"
                  className="ml-1 max-w-[12rem] truncate rounded-full border border-edge bg-transparent px-2.5 py-1 font-mono text-[0.7rem] text-muted outline-none hover:border-cyan/30 focus:border-cyan/40"
                >
                  {selAgent.models.map((m) => (
                    <option key={m} value={m} className="bg-bg text-fg">
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </header>

        {/* Transcript */}
        <div ref={scrollRef} className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Sparkles className="h-8 w-8 text-faint" strokeWidth={1.5} />
              <p className="text-sm text-muted">
                {activeLabel}&apos;e bir şey sor.
                <br />
                <span className="text-faint">
                  Mikrofon ikonuna basıp konuşabilirsin (Türkçe).
                </span>
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  m.role === "user" ? "bg-cyan/15 text-fg" : "panel text-fg"
                )}
              >
                {m.role === "assistant" && (
                  <div className="mb-1 flex items-center gap-1.5 label !text-cyan">
                    <Sparkles className="h-3 w-3" /> {(m.agent ?? "hermes").toLowerCase()}
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}

          {loading && (tool || messages.at(-1)?.role !== "assistant") && (
            <div className="flex justify-start">
              <div className="panel flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan" />
                {tool ?? `${activeLabel} düşünüyor…`}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red/40 bg-red/10 px-4 py-2.5 text-sm text-red">
              {error}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="mt-4 shrink-0">
          <div className="panel flex items-end gap-2 p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={listening ? "Dinliyorum…" : "Mesaj yaz veya mikrofonla konuş…"}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-fg outline-none placeholder:text-faint"
            />

            <button
              onClick={toggleMic}
              disabled={!speechOk}
              title={
                speechOk
                  ? listening
                    ? "Dinlemeyi durdur"
                    : "Mikrofonla konuş"
                  : "Tarayıcı ses tanımayı desteklemiyor (Chrome dene)"
              }
              className={cn(
                "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-colors",
                !speechOk && "cursor-not-allowed border-edge text-faint opacity-50",
                speechOk && !listening && "border-edge text-muted hover:border-cyan/40 hover:text-fg",
                listening && "border-red bg-red/15 text-red"
              )}
            >
              {listening && (
                <span className="absolute h-10 w-10 animate-ping rounded-xl bg-red/30" />
              )}
              <Mic className="relative h-4 w-4" />
            </button>

            <button
              onClick={send}
              disabled={loading || !input.trim()}
              title="Gönder"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan text-bg transition-opacity disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[0.625rem] text-faint">
            <span>Enter ile gönder · Shift+Enter yeni satır</span>
            {source && (
              <span className="rounded border border-edge px-1.5 py-0.5 uppercase tracking-wide">
                {source === "api" ? "Hermes API · stream" : "Hermes CLI"}
              </span>
            )}
            {isOverride && selAgent && (
              <span className="rounded border border-cyan/40 bg-cyan/10 px-1.5 py-0.5 font-mono text-cyan">
                {selAgent.label} · {selModel}
              </span>
            )}
            {usage && (
              <span className="ml-auto font-mono text-muted">
                ↑{usage.promptTokens} ↓{usage.completionTokens}
                {typeof usage.cost === "number" && usage.cost > 0
                  ? ` · $${usage.cost.toFixed(4)}`
                  : ""}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
