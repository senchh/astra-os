import { NextRequest, NextResponse } from "next/server";
import { isDocId, readDoc, writeDoc } from "@/lib/hermes/memory";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("doc");
  if (!isDocId(id)) {
    return NextResponse.json({ error: "invalid doc" }, { status: 400 });
  }
  return NextResponse.json(readDoc(id));
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !isDocId(body.doc) || typeof body.content !== "string") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const content = body.content.slice(0, 64_000);
  try {
    writeDoc(body.doc, content);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
