"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import { Mic, Send, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [speechOk, setSpeechOk] = useState(false);

  const recognitionRef = useRef<any>(null);
  const baseInputRef = useRef("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Set up Web Speech API (Chrome/Edge). Dictates straight into the input.
  useEffect(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    // Defer out of effect body (avoids cascading-render lint + hydration mismatch).
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
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bir hata oluştu.");
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setError("Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col p-6">
      <header className="shrink-0">
        <h1 className="text-2xl font-semibold tracking-tight">Hermes</h1>
        <p className="mt-1 text-sm text-muted">
          Ajanınla canlı sohbet — yaz ya da mikrofonla konuş.
        </p>
      </header>

      {/* Transcript */}
      <div ref={scrollRef} className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="h-8 w-8 text-faint" strokeWidth={1.5} />
            <p className="text-sm text-muted">
              Hermes&apos;e bir şey sor.
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
                m.role === "user"
                  ? "bg-cyan/15 text-fg"
                  : "panel text-fg"
              )}
            >
              {m.role === "assistant" && (
                <div className="mb-1 flex items-center gap-1.5 label !text-cyan">
                  <Sparkles className="h-3 w-3" /> hermes
                </div>
              )}
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="panel flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan" />
              Hermes düşünüyor…
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
        <p className="mt-1.5 px-1 text-[0.625rem] text-faint">
          Enter ile gönder · Shift+Enter yeni satır · yanıtlar yerel Hermes CLI&apos;dan gelir
        </p>
      </div>
    </div>
  );
}
