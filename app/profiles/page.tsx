import { Users } from "lucide-react";
import { readProfiles } from "@/lib/hermes/profiles";
import { PageHeader } from "@/components/shell/page-header";
import { ProfilesBoard } from "@/components/profiles/profiles-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const profiles = readProfiles();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6 stagger-in">
      <PageHeader
        icon={Users}
        eyebrow="Build"
        title="Profiles"
        stats={[
          { label: "profil", value: profiles.length },
          {
            label: "çalışan",
            value: profiles.filter((p) => p.gateway === "running").length,
            accent: "var(--color-green)",
          },
        ]}
      >
        Hermes profilleri — her biri kendi <code className="font-mono text-cyan">.env</code>,
        SOUL.md, hafıza ve oturumlarına sahip ayrı bir ortam. Aktif olanı{" "}
        <code className="font-mono text-cyan">hermes profile use</code> ile değiştir.
      </PageHeader>

      {profiles.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Profil okunamadı. <span className="text-faint">(hermes profile list)</span>
        </div>
      ) : (
        <ProfilesBoard initial={profiles} />
      )}
    </div>
  );
}
