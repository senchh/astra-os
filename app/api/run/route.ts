import { execFile } from "node:child_process";
import fs from "node:fs";
import { HERMES_BIN, LOCAL_BIN, IMAGES_DIR } from "@/lib/hermes/paths";
import { getPreset } from "@/lib/hermes/task-presets";
import { readRuns } from "@/lib/hermes/sessions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */

const IMG_RE = /\.(png|jpe?g|webp|gif)$/i;

// Snapshot the image dir so we can diff and surface exactly what this run made.
function imageSet(): Set<string> {
  try {
    return new Set(fs.readdirSync(IMAGES_DIR).filter((f) => IMG_RE.test(f)));
  } catch {
    return new Set();
  }
}

function run(
  args: string[]
): Promise<{ ok: boolean; out: string; err: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    execFile(
      HERMES_BIN,
      args,
      {
        env: { ...process.env, PATH: `${process.env.PATH ?? ""}:${LOCAL_BIN}` },
        timeout: 180_000, // agent runs (browser / image-gen) can be slow
        maxBuffer: 8 * 1024 * 1024,
      },
      (error: any, stdout, stderr) => {
        resolve({
          ok: !error,
          out: (stdout || "").trim(),
          err: (stderr || "").trim(),
          timedOut: Boolean(error?.killed) && error?.signal === "SIGTERM",
        });
      }
    );
  });
}

export async function POST(req: Request) {
  let body: { preset?: string; input?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const preset = getPreset(typeof body.preset === "string" ? body.preset : "");
  if (!preset) return Response.json({ error: "Geçersiz görev türü." }, { status: 400 });

  const input = typeof body.input === "string" ? body.input.trim() : "";
  if (!input) return Response.json({ error: "Boş girdi." }, { status: 400 });
  if (input.length > 4000)
    return Response.json({ error: "Girdi çok uzun (en fazla 4000 karakter)." }, { status: 400 });

  // `--oneshot=<prompt>` as a single argv element: argparse splits on the first
  // `=`, so a prompt starting with "-" can never be misread as a flag. Array args
  // mean no shell — nothing is interpolated. The toolset id comes from our own
  // whitelist (no dashes), so `-t <toolset>` is inert too.
  const prompt = preset.build(input);
  const args: string[] = [];
  if (preset.toolset) args.push("-t", preset.toolset);
  args.push(`--oneshot=${prompt}`);

  const before = imageSet();
  const beforeTopId = readRuns(1)[0]?.id ?? null;
  const start = Date.now();
  const { ok, out, err, timedOut } = await run(args);
  const durationMs = Date.now() - start;

  // Artifacts this run produced (image-gen / browser screenshots land here).
  const after = imageSet();
  const newImages = [...after].filter((n) => !before.has(n));

  // Best-effort observability touch: the newest ledger row, if it's a *new* row
  // started inside our window, is the run we just triggered — attach its real
  // tokens / tool-calls / model so the user sees what the task actually cost.
  let tokens: number | null = null;
  let toolCalls: number | null = null;
  let model: string | null = null;
  const top = readRuns(1)[0];
  if (top && top.id !== beforeTopId && top.startedAt * 1000 >= start - 5000) {
    tokens = top.totalTokens || null;
    toolCalls = top.toolCalls;
    model = top.model;
  }

  if (!ok) {
    return Response.json({
      ok: false,
      error: timedOut
        ? "Görev zaman aşımına uğradı (3 dk)."
        : err || out || "Görev başarısız oldu.",
      text: out,
      durationMs,
      toolset: preset.toolset,
      newImages,
      model,
      tokens,
      toolCalls,
    });
  }

  return Response.json({
    ok: true,
    text: out,
    durationMs,
    toolset: preset.toolset,
    newImages,
    model,
    tokens,
    toolCalls,
  });
}
