import { readTools } from "@/lib/hermes/tools";
import { ToolsBoard } from "@/components/tools/tools-board";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const tools = readTools();

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Tools</h1>
        <p className="mt-1 text-sm text-muted">
          Hermes&apos;in araç setlerini aç/kapat. Değişiklikler{" "}
          <code className="font-mono text-cyan">hermes tools</code> ile yazılır — anında etkili.
        </p>
      </header>

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
