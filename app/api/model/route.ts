import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";
import { readControlRoom } from "@/lib/hermes/control";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const run = promisify(execFile);
const opts = {
  cwd: os.homedir(),
  timeout: 20_000,
  env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
};

export async function POST(req: Request) {
  let body: { provider?: unknown; model?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { provider, model } = body;
  if (typeof provider !== "string" || typeof model !== "string") {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  // Validate against authed providers (credential_pool) and their cached models —
  // we never write a provider that isn't logged-in or a model the provider doesn't list.
  const cr = readControlRoom();
  const p = cr.providers.find((x) => x.id === provider);
  if (!p) {
    return Response.json({ error: "Sağlayıcı oturum açık değil." }, { status: 400 });
  }
  if (!p.models.includes(model)) {
    return Response.json({ error: "Model bu sağlayıcıda bulunamadı." }, { status: 400 });
  }

  try {
    // Order matters little, but set provider then model.
    await run(HERMES_BIN, ["config", "set", "model.provider", provider], opts);
    await run(HERMES_BIN, ["config", "set", "model.default", model], opts);
    return Response.json({ ok: true, provider, model });
  } catch (e) {
    const err = e as { stderr?: string; stdout?: string; message?: string };
    const detail =
      (err.stderr || err.stdout || err.message || "").toString().trim().slice(0, 300) ||
      "Hermes komutu başarısız oldu.";
    return Response.json({ error: detail }, { status: 502 });
  }
}
