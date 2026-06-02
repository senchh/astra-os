import { execFile } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Profile names: identifiers + 'default'. execFile (array args) already avoids
// shell injection; this is belt-and-suspenders.
const VALID_NAME = /^[A-Za-z0-9_.-]+$/;

export async function POST(req: Request) {
  let body: { action?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { action, name } = body;
  // Only "use" (switch sticky default) is supported — reversible, no data loss.
  if (action !== "use") {
    return Response.json({ error: "Desteklenmeyen işlem." }, { status: 400 });
  }
  if (typeof name !== "string" || !VALID_NAME.test(name) || name.length > 64) {
    return Response.json({ error: "Geçersiz profil adı." }, { status: 400 });
  }

  return new Promise<Response>((resolve) => {
    execFile(
      HERMES_BIN,
      ["profile", "use", name],
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
          resolve(Response.json({ ok: true, name }));
        }
      }
    );
  });
}
