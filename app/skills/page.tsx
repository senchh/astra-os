import { Blocks } from "lucide-react";
import { readSkills } from "@/lib/hermes/skills";
import { PageHeader } from "@/components/shell/page-header";
import { SkillsBrowser } from "@/components/skills/skills-browser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const cat = readSkills();

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6 stagger-in">
      <PageHeader icon={Blocks} eyebrow="Build" title="Skills">
        Hermes&apos;in yüklü yetenek kataloğu — her biri ihtiyaç anında ajana enjekte edilen bir
        talimat seti. Devre dışı bırakmak skill&apos;i ajanın bağlamından çıkarır (token tasarrufu,
        ama yetenek kaybı) — kullanım sayısı neyi kapatmanın güvenli olduğunu gösterir.{" "}
        <span className="text-faint">(~/.hermes/skills · config.yaml skills.disabled)</span>
      </PageHeader>

      {cat.total === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Yüklü skill yok. <span className="text-faint">(~/.hermes/skills)</span>
        </div>
      ) : (
        <SkillsBrowser initial={cat} />
      )}
    </div>
  );
}
