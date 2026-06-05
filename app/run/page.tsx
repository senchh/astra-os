import { Rocket } from "lucide-react";
import { readControlRoom } from "@/lib/hermes/control";
import { PageHeader } from "@/components/shell/page-header";
import { RunLauncher } from "@/components/run/run-launcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const cr = readControlRoom();
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6 stagger-in">
      <PageHeader
        icon={Rocket}
        eyebrow="Operate"
        title="Run a Task"
        stats={[{ label: "model", value: cr.defaultModel, accent: "var(--color-violet)" }]}
      >
        Ajana tek seferlik bir iş yaptır — web araştırması, görsel, ekran görüntüsü
        veya serbest görev. Sonuç ve ürettiği görseller burada belirir.
      </PageHeader>

      <RunLauncher model={cr.defaultModel} provider={cr.defaultProvider} />
    </div>
  );
}
