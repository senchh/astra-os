import { execFile } from "node:child_process";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Only these three lifecycle actions are exposed. `status` is read-only and
// already served by the Control Room reader (gateway_state.json); install /
// uninstall / setup are out of scope (they reconfigure the service, not toggle it).
const ACTIONS = new Set(["start", "stop", "restart"]);

function run(args: string[]): Promise<{ ok: boolean; out: string; err: string }> {
  return new Promise((resolve) => {
    execFile(
      HERMES_BIN,
      args,
      {
        env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
        timeout: 60_000, // restart = stop + start; allow headroom
        maxBuffer: 2 * 1024 * 1024,
      },
      (error: any, stdout, stderr) => {
        resolve({ ok: !error, out: (stdout || "").trim(), err: (stderr || "").trim() });
      }
    );
  });
}

export async function POST(req: Request) {
  let body: { action?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  if (!ACTIONS.has(action))
    return Response.json({ error: "Geçersiz işlem." }, { status: 400 });

  // Array args = no shell; the action is allowlisted, so nothing is interpolated.
  const { ok, out, err } = await run(["gateway", action]);

  if (!ok) {
    return Response.json({ ok: false, action, error: err || out || "Komut başarısız oldu." });
  }
  return Response.json({ ok: true, action, message: out || "Tamamlandı." });
}
