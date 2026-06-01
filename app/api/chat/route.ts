import { execFile } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

/**
 * Conversation continuity is done by threading the transcript into a single
 * prompt rather than juggling Hermes session IDs — deterministic, and every
 * call still gets Hermes' own memory/persona injection. We cap the history to
 * keep the prompt (and cost) bounded.
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

function runHermes(prompt: string): Promise<{ ok: boolean; text: string }> {
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

export async function POST(req: Request) {
  let body: { messages?: Msg[] };
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

  const result = await runHermes(buildPrompt(messages));
  if (!result.ok) return Response.json({ error: result.text }, { status: 502 });
  return Response.json({ reply: result.text });
}
