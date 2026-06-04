import { readAllDocs } from "@/lib/hermes/memory";
import { MemoryWorkspace } from "@/components/memory/memory-workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const docs = readAllDocs();

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Memory</h1>
        <p className="mt-1 text-sm text-muted">
          Hermes&apos;in kişisel hafızası — notlar (
          <code className="font-mono text-cyan">MEMORY.md</code>), profilin (
          <code className="font-mono text-cyan">USER.md</code>) ve persona (
          <code className="font-mono text-cyan">SOUL.md</code>). Değişiklik anında etkili.
        </p>
      </header>

      <MemoryWorkspace docs={docs} />
    </div>
  );
}
