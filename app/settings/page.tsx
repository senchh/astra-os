import { readSettings } from "@/lib/hermes/settings";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const settings = readSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Ajan davranışı &amp; görünüm.{" "}
          <code className="font-mono text-cyan">hermes config set</code> ile yazılır — değişiklik
          anında, seçildiği an etkili.
        </p>
      </header>

      <SettingsPanel settings={settings} />
    </div>
  );
}
