import { execFile } from "node:child_process";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";
import { readSendTargets } from "@/lib/hermes/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

function run(args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((resolve) => {
    execFile(
      HERMES_BIN,
      args,
      {
        env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      },
      (error, stdout, stderr) => {
        resolve({ ok: !error, out: (stdout || "").trim(), err: (stderr || "").trim() });
      }
    );
  });
}

export async function POST(req: Request) {
  let body: { target?: string; message?: string; subject?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const target = typeof body.target === "string" ? body.target : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";

  if (!message) return Response.json({ error: "Boş mesaj." }, { status: 400 });
  if (message.length > 4000)
    return Response.json({ error: "Mesaj çok uzun (en fazla 4000 karakter)." }, { status: 400 });
  if (subject.length > 200)
    return Response.json({ error: "Konu çok uzun." }, { status: 400 });

  // Validate the target against the live list — only configured channels are
  // sendable, so an arbitrary `--to` can never be injected.
  const allowed = new Set(readSendTargets().map((t) => t.target));
  if (!allowed.has(target))
    return Response.json({ error: "Geçersiz hedef." }, { status: 400 });

  // `--` stops flag parsing so a message starting with "-" stays a positional;
  // array args mean no shell, so nothing here is interpolated.
  const args = ["send", "--to", target, "--json"];
  if (subject) args.push("-s", subject);
  args.push("--", message);

  const { ok, out, err } = await run(args);
  let parsed: any = null;
  try {
    parsed = JSON.parse(out);
  } catch {
    /* non-JSON output */
  }

  if (!ok || parsed?.ok === false) {
    return Response.json({
      ok: false,
      error: parsed?.error || err || out || "Gönderilemedi.",
    });
  }
  return Response.json({ ok: true, result: parsed ?? out });
}
