import fs from "node:fs";
import { NextRequest } from "next/server";
import { resolveImage } from "@/lib/hermes/outputs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? "";
  const file = resolveImage(name);
  if (!file) {
    return new Response("not found", { status: 404 });
  }
  const ext = name.split(".").pop()?.toLowerCase() ?? "png";
  const buf = fs.readFileSync(file);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": MIME[ext] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=60",
    },
  });
}
