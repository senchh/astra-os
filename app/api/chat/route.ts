import { execFile } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";
import { isApiReady, streamChat, type ChatMessage } from "@/lib/hermes/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/**
 * CLI fallback only: thread the transcript into one prompt rather than juggling
 * session IDs. The API path sends a real messages array instead.
 */
function buildPrompt(messages: Msg[]): string {
  const recent = messages.slice(-12);
  if (recent.length === 1) return recent[0].content;

  const lines = recent.map(
    (m) => `${m.role === "user" ? "Kullanıcı" : "Sen"}: ${m.content}`
  );
  return [
    "Aşağıda kullanıcıyla aranda süregelen bir sohbet var. Son kullanıcı " +
      "mesajına, önceki bağlamı dikkate alarak doğal şekilde yanıt ver. " +
      "Hermes rolünü koru.",
    "",
    ...lines,
    "Sen:",
  ].join("\n");
}

function runHermesCli(prompt: string): Promise<{ ok: boolean; text: string }> {
  return new Promise((resolve) => {
    execFile(
      HERMES_BIN,
      ["chat", "-q", prompt, "-Q", "--source", "tool"],
      {
        cwd: os.homedir(),
        timeout: 150_000,
        maxBuffer: 8 * 1024 * 1024,
        env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
      },
      (err, stdout, stderr) => {
        const out = (stdout || "").trim();
        if (err) {
          resolve({
            ok: false,
            text:
              out ||
              (stderr || "").trim() ||
              "Hermes yanıt veremedi (zaman aşımı veya hata).",
          });
        } else {
          resolve({ ok: true, text: out || "(boş yanıt)" });
        }
      }
    );
  });
}

const encoder = new TextEncoder();
function frame(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: Request) {
  let body: { messages?: Msg[]; sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const last = messages.at(-1);
  if (!last || last.role !== "user" || !last.content.trim()) {
    return Response.json({ error: "Boş mesaj." }, { status: 400 });
  }

  const apiUp = await isApiReady();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(frame(event, data));
      send("meta", { source: apiUp ? "api" : "cli" });

      try {
        if (apiUp) {
          const apiMessages: ChatMessage[] = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));
          await streamChat(
            { messages: apiMessages, sessionId: body.sessionId },
            {
              onChunk: (t) => send("chunk", t),
              onToolProgress: (t) => send("tool", t),
              onUsage: (u) => send("usage", u),
              onError: (m) => send("error", m),
              onDone: () => {},
            }
          );
        } else {
          const result = await runHermesCli(buildPrompt(messages));
          if (!result.ok) send("error", result.text);
          else send("chunk", result.text);
        }
      } catch (e) {
        send("error", (e as Error).message || "Akış sırasında hata.");
      } finally {
        send("done", {});
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
