import fs from "node:fs";
import path from "node:path";
import { HERMES_DIR } from "./paths";
import { makeSsePump, type SseCallbacks } from "./sse";

/**
 * Hermes integration client. Talks to the agent's OpenAI-compatible HTTP API
 * (`/v1/chat/completions`, SSE) at a local or remote endpoint. The chat route
 * uses this when the API is reachable and falls back to the CLI otherwise —
 * mirroring fathah/hermes-desktop's API-first / CLI-fallback design.
 *
 * Remote mode is a single env switch (HERMES_API_URL + HERMES_API_KEY), so the
 * same code deploys against a remote Hermes server without changes.
 */

const LOCAL_API_URL = "http://127.0.0.1:8642";

function normalise(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
}

export function isRemote(): boolean {
  return Boolean(process.env.HERMES_API_URL?.trim());
}

export function getApiUrl(): string {
  const remote = process.env.HERMES_API_URL?.trim();
  return remote ? normalise(remote) : LOCAL_API_URL;
}

/**
 * Local mode reads API_SERVER_KEY from ~/.hermes/.env; remote mode uses
 * HERMES_API_KEY. Returns null when no key is configured (local installs
 * without the desktop app's auto-generated key).
 */
export function getApiKey(): string | null {
  const env = process.env.HERMES_API_KEY?.trim();
  if (env) return env;
  try {
    const dotenv = fs.readFileSync(path.join(HERMES_DIR, ".env"), "utf8");
    const m = dotenv.match(/^\s*API_SERVER_KEY\s*=\s*(.+?)\s*$/m);
    if (m) return m[1].replace(/^["']|["']$/g, "").trim() || null;
  } catch {
    /* no .env or unreadable */
  }
  return null;
}

function authHeaders(): Record<string, string> {
  const key = getApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

/** Cheap liveness probe — `GET /health`. */
export async function isApiReady(timeoutMs = 1200): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${getApiUrl()}/health`, {
      signal: ctrl.signal,
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface StreamChatParams {
  messages: ChatMessage[];
  model?: string;
  sessionId?: string;
  signal?: AbortSignal;
}

/**
 * POST the conversation to `/v1/chat/completions` (stream=true) and drive the
 * SSE callbacks as tokens, tool-progress, and usage arrive.
 */
export async function streamChat(
  params: StreamChatParams,
  cb: SseCallbacks
): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...authHeaders(),
  };
  // X-Hermes-Session-Id keeps each chat in its own state.db lane (the gateway
  // gates it behind auth, so only send it when we have a key).
  if (params.sessionId && headers.Authorization) {
    headers["X-Hermes-Session-Id"] = params.sessionId;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiUrl()}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: params.model || "hermes-agent",
        messages: params.messages,
        stream: true,
        ...(params.sessionId ? { session_id: params.sessionId } : {}),
      }),
      signal: params.signal,
    });
  } catch (e) {
    cb.onError?.((e as Error).message || "Hermes API'sine bağlanılamadı.");
    return;
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    cb.onError?.(detail.slice(0, 400) || `Hermes API ${res.status}`);
    return;
  }

  const pump = makeSsePump(cb);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    pump.push(decoder.decode(value, { stream: true }));
  }
  pump.end();
}
