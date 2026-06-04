import { readControlRoom } from "@/lib/hermes/control";
import { RunLauncher } from "@/components/run/run-launcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const cr = readControlRoom();
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Run a Task</h1>
        <p className="mt-1 text-sm text-muted">
          Ajana tek seferlik bir iş yaptır — web araştırması, görsel, ekran görüntüsü
          veya serbest görev. Sonuç ve ürettiği görseller burada belirir.
        </p>
      </header>

      <RunLauncher model={cr.defaultModel} provider={cr.defaultProvider} />
    </div>
  );
}
