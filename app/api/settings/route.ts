import { execFile } from "node:child_process";
import os from "node:os";
import { HERMES_BIN, LOCAL_BIN } from "@/lib/hermes/paths";
import { SETTING_FIELDS } from "@/lib/hermes/settings-fields";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BY_KEY = new Map(SETTING_FIELDS.map((f) => [f.key, f]));

// Validate value against the field's known domain — the CLI does NOT validate,
// so this server-side check is the real guardrail against writing garbage.
function normalize(field: (typeof SETTING_FIELDS)[number], raw: unknown): string | null {
  switch (field.kind) {
    case "bool":
      if (raw === true || raw === "true") return "true";
      if (raw === false || raw === "false") return "false";
      return null;
    case "enum":
      return typeof raw === "string" && field.options?.includes(raw) ? raw : null;
    case "number": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
      if (field.min != null && n < field.min) return null;
      if (field.max != null && n > field.max) return null;
      return String(n);
    }
  }
}

export async function POST(req: Request) {
  let body: { key?: unknown; value?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { key, value } = body;
  if (typeof key !== "string" || !BY_KEY.has(key)) {
    return Response.json({ error: "İzin verilmeyen ayar anahtarı." }, { status: 400 });
  }
  const field = BY_KEY.get(key)!;
  const normalized = normalize(field, value);
  if (normalized === null) {
    return Response.json({ error: "Geçersiz değer." }, { status: 400 });
  }

  return new Promise<Response>((resolve) => {
    execFile(
      HERMES_BIN,
      ["config", "set", key, normalized],
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
          resolve(Response.json({ ok: true, key, value: normalized }));
        }
      }
    );
  });
}
