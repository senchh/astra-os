import { readControlRoom } from "@/lib/hermes/control";
import { readPerfMetrics } from "@/lib/hermes/metrics";
import { StatCard } from "@/components/overview/stat-card";
import { ProviderModelSelect } from "@/components/control/provider-model-select";
import { GatewayControl } from "@/components/control/gateway-control";
import { SendComposer } from "@/components/control/send-composer";
import { readSendTargets } from "@/lib/hermes/send";
import { relTime } from "@/lib/utils";
import type {
  CredStatus,
  Credential,
  ProviderInfo,
  ProviderPerf,
} from "@/lib/hermes/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS_META: Record<CredStatus, { label: string; color: string }> = {
  ok: { label: "OK", color: "var(--color-green)" },
  exhausted: { label: "TÜKENDİ", color: "var(--color-amber)" },
  error: { label: "HATA", color: "var(--color-red)" },
  unknown: { label: "—", color: "var(--color-faint)" },
};

function StatusChip({ status }: { status: CredStatus }) {
  const m = STATUS_META[status];
  return (
    <span
      className="shrink-0 rounded-full border px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider"
      style={{ color: m.color, borderColor: m.color }}
    >
      {m.label}
    </span>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: color, boxShadow: `0 0 8px ${color}` }}
    />
  );
}

function CredRow({ c }: { c: Credential }) {
  const broken = c.status === "error" || c.status === "exhausted";
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Dot color={STATUS_META[c.status].color} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
          {c.label}
        </span>
        <span className="shrink-0 rounded-md border border-edge px-1.5 py-0.5 text-[0.625rem] font-medium tracking-wide text-muted">
          {c.authType}
        </span>
        <StatusChip status={c.status} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 pl-5 text-xs text-muted">
        <span className="font-mono text-faint">{c.source}</span>
        {c.requestCount > 0 && <span>{c.requestCount} istek</span>}
        {c.fingerprint && (
          <span className="truncate font-mono text-faint" title={c.fingerprint}>
            {c.fingerprint}
          </span>
        )}
      </div>

      {broken && (c.errorReason || c.errorMessage) && (
        <div
          className="mt-1.5 pl-5 text-xs"
          style={{ color: STATUS_META[c.status].color }}
        >
          {c.errorMessage ?? c.errorReason}
          {c.errorCode ? <span className="text-faint"> · {c.errorCode}</span> : null}
          {c.errorResetAt && (
            <span className="text-faint"> · sıfırlanır {relTime(c.errorResetAt)}</span>
          )}
        </div>
      )}
    </div>
  );
}

// p50 ≤4s → green, ≤8s → amber, else red.
function latColor(p50: number): string {
  if (p50 <= 4) return "var(--color-green)";
  if (p50 <= 8) return "var(--color-amber)";
  return "var(--color-red)";
}

function PerfStrip({ perf }: { perf: ProviderPerf }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-edge bg-panel-2/30 px-4 py-2 text-xs text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: latColor(perf.p50) }}
        />
        <span className="font-medium text-fg">p50 {perf.p50}s</span>
      </span>
      <span>p95 {perf.p95}s</span>
      <span>{perf.calls} çağrı</span>
      {perf.cacheHitPct !== null && (
        <span className="text-faint">cache %{perf.cacheHitPct}</span>
      )}
      {perf.lastCallAt && (
        <span className="ml-auto text-faint">{relTime(perf.lastCallAt)}</span>
      )}
    </div>
  );
}

function ProviderCard({
  p,
  perf,
  currentModel,
  currentProvider,
}: {
  p: ProviderInfo;
  perf?: ProviderPerf;
  currentModel: string;
  currentProvider: string;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-edge px-4 py-3">
        <Dot color={STATUS_META[p.status].color} />
        <span className="font-mono text-sm font-semibold text-fg">{p.id}</span>
        {p.isActive && (
          <span className="rounded-full border border-cyan px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider text-cyan">
            AKTİF
          </span>
        )}
        {p.isDefault && !p.isActive && (
          <span className="rounded-full border border-violet px-2 py-0.5 text-[0.625rem] font-semibold tracking-wider text-violet">
            VARSAYILAN
          </span>
        )}
        <span className="ml-auto text-xs text-faint">
          {p.modelCount > 0 ? `${p.modelCount} model` : "—"}
          <span className="text-muted">
            {" · "}
            {p.credentials.length} anahtar
          </span>
        </span>
      </div>
      {perf && <PerfStrip perf={perf} />}
      <div className="divide-y divide-edge">
        {p.credentials.map((c) => (
          <CredRow key={c.id} c={c} />
        ))}
      </div>
      <div className="border-t border-edge">
        <ProviderModelSelect
          provider={p.id}
          models={p.models}
          currentModel={currentModel}
          isCurrentProvider={p.id === currentProvider}
        />
      </div>
    </div>
  );
}

export default function Page() {
  const cr = readControlRoom();
  const perf = readPerfMetrics();
  const sendTargets = readSendTargets();
  const healthy = cr.providers.filter((p) => p.status === "ok").length;
  const hasPerf = perf.totalCalls > 0;

  // Health of the provider serving the default model — "is the AI I'm using working?".
  // This replaces the old `active_provider` stat, which is a separate auth-pool
  // pointer that often diverges from the model's provider and misleads.
  const defaultProviderInfo = cr.providers.find((p) => p.isDefault);
  const defaultStatus: CredStatus = defaultProviderInfo?.status ?? "unknown";
  const HEALTH_WORD: Record<CredStatus, string> = {
    ok: "sağlıklı",
    exhausted: "tükendi",
    error: "hata",
    unknown: "—",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Control Room</h1>
        <p className="mt-1 text-sm text-muted">
          Sağlayıcılar, kimlik anahtarları ve gateway — tek panelde.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="varsayılan sağlayıcı"
          value={HEALTH_WORD[defaultStatus]}
          sub={cr.defaultProvider || undefined}
          accent={STATUS_META[defaultStatus].color}
        />
        <StatCard
          label="varsayılan model"
          value={cr.defaultModel}
          sub={cr.defaultProvider || undefined}
          accent="var(--color-violet)"
        />
        <StatCard
          label="p50 yanıt"
          value={hasPerf ? `${perf.p50}s` : "—"}
          sub={hasPerf ? `p95 ${perf.p95}s · ${perf.totalCalls} çağrı` : undefined}
          accent={hasPerf ? latColor(perf.p50) : "var(--color-faint)"}
        />
        <StatCard
          label="sağlıklı sağlayıcı"
          value={`${healthy}/${cr.providers.length}`}
          accent={healthy ? "var(--color-green)" : "var(--color-amber)"}
        />
      </section>

      <section className="space-y-2">
        <div className="label">sağlayıcılar &amp; anahtarlar</div>
        {cr.providers.length === 0 ? (
          <div className="panel p-8 text-center text-sm text-muted">
            Sağlayıcı bulunamadı.{" "}
            <span className="text-faint">(~/.hermes/auth.json)</span>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {cr.providers.map((p) => (
              <ProviderCard
                key={p.id}
                p={p}
                perf={perf.byProvider[p.id]}
                currentModel={cr.defaultModel}
                currentProvider={cr.defaultProvider}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4">
          <div className="label">gateway &amp; kanallar</div>
          <GatewayControl gateway={cr.gateway} />
        </div>

        <div className="panel p-4">
          <div className="label">ses</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-2.5">
              <Dot color="var(--color-cyan)" />
              <span className="text-fg">Konuşma → Metin (STT)</span>
              <span className="ml-auto text-xs text-muted">
                {cr.voice.sttEnabled ? cr.voice.stt ?? "açık" : "kapalı"}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <Dot color="var(--color-violet)" />
              <span className="text-fg">Metin → Konuşma (TTS)</span>
              <span className="ml-auto text-xs text-muted">
                {cr.voice.tts ?? "—"}
              </span>
            </div>
          </div>
          {cr.updatedAt && (
            <div className="mt-4 border-t border-edge pt-3 text-xs text-faint">
              kimlik bilgileri güncellendi {relTime(cr.updatedAt)}
            </div>
          )}
        </div>
      </section>

      <section>
        <SendComposer targets={sendTargets} />
      </section>
    </div>
  );
}
