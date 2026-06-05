import { Brain } from "lucide-react";
import { readAllDocs } from "@/lib/hermes/memory";
import { PageHeader } from "@/components/shell/page-header";
import { MemoryWorkspace } from "@/components/memory/memory-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const docs = readAllDocs();

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6 stagger-in">
      <PageHeader icon={Brain} eyebrow="Self" title="Memory">
        Hermes&apos;in kişisel hafızası — notlar (
        <code className="font-mono text-cyan">MEMORY.md</code>), profilin (
        <code className="font-mono text-cyan">USER.md</code>) ve persona (
        <code className="font-mono text-cyan">SOUL.md</code>). Değişiklik anında etkili.
      </PageHeader>

      <MemoryWorkspace docs={docs} />
    </div>
  );
}
