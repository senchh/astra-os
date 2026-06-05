import { Wrench } from "lucide-react";
import { readTools } from "@/lib/hermes/tools";
import { PageHeader } from "@/components/shell/page-header";
import { ToolsBoard } from "@/components/tools/tools-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const tools = readTools();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6 stagger-in">
      <PageHeader icon={Wrench} eyebrow="Build" title="Tools">
        Hermes&apos;in araç setlerini aç/kapat. Değişiklikler{" "}
        <code className="font-mono text-cyan">hermes tools</code> ile yazılır — anında etkili.
      </PageHeader>

      {tools.length === 0 ? (
        <div className="panel p-8 text-center text-sm text-muted">
          Araç seti okunamadı.{" "}
          <span className="text-faint">(hermes tools list)</span>
        </div>
      ) : (
        <ToolsBoard initial={tools} />
      )}
    </div>
  );
}
