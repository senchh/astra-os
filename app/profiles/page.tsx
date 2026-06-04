import { readProfiles } from "@/lib/hermes/profiles";
import { ProfilesBoard } from "@/components/profiles/profiles-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const profiles = readProfiles();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Profiles</h1>
        <p className="mt-1 text-sm text-muted">
          Hermes profilleri — her biri kendi <code className="font-mono text-cyan">.env</code>,
          SOUL.md, hafıza ve oturumlarına sahip ayrı bir ortam. Aktif olanı{" "}
          <code className="font-mono text-cyan">hermes profile use</code> ile değiştir.
        </p>
      </header>

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
