"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Per-provider model selector, rendered inside each Control Room provider card.
// Picking a model switches the default model + provider to this card's provider.
export function ProviderModelSelect({
  provider,
  models,
  currentModel,
  isCurrentProvider,
}: {
  provider: string;
  models: string[];
  currentModel: string;
  isCurrentProvider: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (models.length === 0) return null;

  async function choose(model: string) {
    if (!model || (isCurrentProvider && model === currentModel)) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Model değiştirilemedi.");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 py-3">
      <span className="label shrink-0">model</span>
      <div className="relative flex-1">
        <select
          value={isCurrentProvider ? currentModel : ""}
          disabled={pending}
          onChange={(e) => choose(e.target.value)}
          className={cn(
            "w-full appearance-none rounded-lg border bg-bg-2 px-2.5 py-1.5 font-mono text-xs outline-none transition-colors disabled:opacity-60",
            isCurrentProvider ? "border-violet/50 text-violet" : "border-edge text-muted"
          )}
        >
          {!isCurrentProvider && <option value="">bu sağlayıcıya geç…</option>}
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      {pending && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-violet" />}
      {saved && !pending && (
        <span className="flex shrink-0 items-center gap-0.5 text-xs text-green">
          <Check className="h-3 w-3" strokeWidth={2.5} /> aktif
        </span>
      )}
      {isCurrentProvider && !saved && !pending && (
        <span className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wider text-violet">
          varsayılan
        </span>
      )}
      {error && <span className="shrink-0 text-xs text-red">!</span>}
    </div>
  );
}
