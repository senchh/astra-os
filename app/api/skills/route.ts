import { readSkills, writeDisabledSkills, isSkillId } from "@/lib/hermes/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Toggle a skill on/off by rewriting config.yaml's `skills.disabled` list.
// (See lib/hermes/skills.ts for why neither `hermes config set` nor
// `hermes skills config` is a usable writer here.)
export async function POST(req: Request) {
  let body: { id?: unknown; enable?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const { id, enable } = body;
  if (typeof id !== "string" || !isSkillId(id) || typeof enable !== "boolean") {
    return Response.json({ error: "Geçersiz skill isteği." }, { status: 400 });
  }

  const cat = readSkills();
  if (!cat.skills.some((s) => s.id === id)) {
    return Response.json({ error: `Bilinmeyen skill: ${id}` }, { status: 404 });
  }

  // Current disabled set ± this skill.
  const disabled = new Set(cat.skills.filter((s) => !s.enabled).map((s) => s.id));
  if (enable) disabled.delete(id);
  else disabled.add(id);

  try {
    writeDisabledSkills([...disabled].sort());
  } catch (e) {
    return Response.json(
      { error: (e as Error).message || "config.yaml yazılamadı." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, id, enabled: enable });
}
