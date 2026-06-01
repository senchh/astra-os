import { execFile } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Toolset ids are lowercase identifiers (web, code_execution, image_gen…).
// Validate before passing to the CLI — execFile already avoids shell injection
// (args are an array, no shell), this is belt-and-suspenders.
const VALID_ID = /^[a-z0-9_]+$/;

export async function POST(req: Request) {
  let body: { id?: unknown; enable?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { id, enable } = body;
  if (typeof id !== "string" || !VALID_ID.test(id) || typeof enable !== "boolean") {
    return Response.json({ error: "Geçersiz toolset isteği." }, { status: 400 });
  }

  const sub = enable ? "enable" : "disable";

  return new Promise<Response>((resolve) => {
    execFile(
      HERMES_BIN,
      ["tools", sub, id, "--platform", "cli"],
      {
        cwd: os.homedir(),
        timeout: 20_000,
        env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
      },
      (err, stdout, stderr) => {
        if (err) {
          const detail =
            (stderr || stdout || "").toString().trim().slice(0, 300) ||
            "Hermes komutu başarısız oldu.";
          resolve(Response.json({ error: detail }, { status: 502 }));
        } else {
          resolve(Response.json({ ok: true, id, enabled: enable }));
        }
      }
    );
  });
}
