import { Settings } from "lucide-react";
import { readSettings } from "@/lib/hermes/settings";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsPanel } from "@/components/settings/settings-panel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const settings = readSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6 stagger-in">
      <PageHeader icon={Settings} eyebrow="Self" title="Settings">
        Ajan davranışı &amp; görünüm.{" "}
        <code className="font-mono text-cyan">hermes config set</code> ile yazılır — değişiklik
        anında, seçildiği an etkili.
      </PageHeader>

      <SettingsPanel settings={settings} />
    </div>
  );
}
