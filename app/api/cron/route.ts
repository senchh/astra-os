import { execFile } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID = /^[A-Za-z0-9_.:-]+$/;
const PROFILE = /^[A-Za-z0-9_-]+$/;
const DELIVER = new Set(["origin", "local", "telegram", "discord", "signal"]);
const LIFECYCLE = new Set(["pause", "resume", "remove", "run"]);

function run(args: string[]): Promise<{ ok: boolean; detail: string }> {
  return new Promise((resolve) => {
    execFile(
      HERMES_BIN,
      args,
      {
        cwd: os.homedir(),
        timeout: 30_000,
        env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
      },
      (err, stdout, stderr) => {
        const detail = (err ? stderr || stdout : stdout || "").toString().trim().slice(0, 400);
        resolve({ ok: !err, detail: detail || (err ? "Hermes komutu başarısız oldu." : "") });
      }
    );
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  // Lifecycle: pause / resume / remove / run <job_id>
  if (LIFECYCLE.has(action)) {
    const id = String(body.jobId ?? "");
    if (!ID.test(id)) return Response.json({ error: "Geçersiz job id." }, { status: 400 });
    const r = await run(["cron", action, id]);
    return r.ok
      ? Response.json({ ok: true, detail: r.detail })
      : Response.json({ error: r.detail }, { status: 502 });
  }

  // Create: hermes cron create [--name] [--deliver] [--profile] <schedule> [prompt]
  if (action === "create") {
    const schedule = String(body.schedule ?? "").trim().slice(0, 100);
    if (!schedule) return Response.json({ error: "Zamanlama (schedule) gerekli." }, { status: 400 });

    const prompt = String(body.prompt ?? "").trim().slice(0, 2000);
    const name = String(body.name ?? "").trim().slice(0, 100);
    const deliver = String(body.deliver ?? "").trim();
    const profile = String(body.profile ?? "").trim();

    if (deliver && !DELIVER.has(deliver))
      return Response.json({ error: "Geçersiz teslimat hedefi." }, { status: 400 });
    if (profile && !PROFILE.test(profile))
      return Response.json({ error: "Geçersiz profil adı." }, { status: 400 });

    const args = ["cron", "create"];
    if (name) args.push("--name", name);
    if (deliver) args.push("--deliver", deliver);
    if (profile) args.push("--profile", profile);
    args.push(schedule);
    if (prompt) args.push(prompt);

    const r = await run(args);
    return r.ok
      ? Response.json({ ok: true, detail: r.detail })
      : Response.json({ error: r.detail }, { status: 502 });
  }

  return Response.json({ error: "Bilinmeyen işlem." }, { status: 400 });
}
