"use client";

import { useState } from "react";
import { Send, Loader2, Check } from "lucide-react";
import type { SendTarget } from "@/lib/hermes/types";

/**
 * Action trigger: push a message to a configured platform via `hermes send`.
 * Distinct from the config-writes — this fires a real outbound action, but a
 * safe one (no LLM/agent loop; bot platforms don't even need a running gateway).
 */
export function SendComposer({ targets }: { targets: SendTarget[] }) {
  const [target, setTarget] = useState(targets[0]?.target ?? "");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send() {
    const text = message.trim();
    if (!text || !target || sending) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, message: text }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({ ok: true, text: "Gönderildi." });
        setMessage("");
      } else {
        setResult({ ok: false, text: data.error || "Gönderilemedi." });
      }
    } catch {
      setResult({ ok: false, text: "Sunucuya ulaşılamadı." });
    } finally {
      setSending(false);
    }
  }

  if (targets.length === 0) {
    return (
      <div className="panel p-4">
        <div className="label">mesaj gönder</div>
        <p className="mt-3 text-xs text-faint">
          Yapılandırılmış mesajlaşma kanalı yok.
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <div className="label">mesaj gönder</div>
        <span className="text-[0.625rem] text-faint">
          hermes send · LLM yok, anlık
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="w-full rounded-lg border border-edge bg-transparent px-2.5 py-2 text-sm text-fg outline-none focus:border-cyan/40"
        >
          {targets.map((t) => (
            <option key={t.target} value={t.target} className="bg-bg text-fg">
              {t.platform} · {t.name}
              {t.type ? ` (${t.type})` : ""}
            </option>
          ))}
        </select>

        <textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            if (result) setResult(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          rows={3}
          placeholder="Kanala gönderilecek mesaj…"
          className="max-h-48 min-h-[4.5rem] w-full resize-y rounded-lg border border-edge bg-transparent px-2.5 py-2 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={send}
            disabled={sending || !message.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-cyan px-3 py-1.5 text-xs font-medium text-bg transition-opacity disabled:opacity-40"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Gönder
          </button>
          <span className="text-[0.625rem] text-faint">⌘/Ctrl + Enter</span>

          {result && (
            <span
              className={`ml-auto flex items-center gap-1 text-xs ${
                result.ok ? "text-green" : "text-red"
              }`}
            >
              {result.ok && <Check className="h-3.5 w-3.5" />}
              {result.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
