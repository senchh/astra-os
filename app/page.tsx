import { Sparkles } from "lucide-react";
import { getAgents } from "@/lib/hermes/health";
import { summarizeActivity } from "@/lib/hermes/sessions";
import { readPerfMetrics } from "@/lib/hermes/metrics";
import { readControlRoom } from "@/lib/hermes/control";
import { Orrery } from "@/components/orrery";
import { TelemetryTicker, type TickerCell } from "@/components/overview/telemetry-ticker";
import { ProviderHealthPanel, type ProviderHealthRow } from "@/components/overview/provider-health-panel";
import { HeroStat } from "@/components/overview/hero-stat";
import { Sparkline, Bars } from "@/components/overview/sparkline";
import { compactNum, relTime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// p50 ≤4s green, ≤8s amber, else red.
function latColor(p50: number): string {
  if (p50 <= 0) return "var(--color-faint)";
  if (p50 <= 4) return "var(--color-green)";
  if (p50 <= 8) return "var(--color-amber)";
  return "var(--color-red)";
}

export default function Page() {
  const agents = getAgents();
  const activity = summarizeActivity(7);
  const perf = readPerfMetrics();
  const cr = readControlRoom();

  const liveAgents = agents.filter((a) => a.health === "live").length;
  const healthy = cr.providers.filter((p) => p.status === "ok").length;
  const gatewayUp = cr.gateway.state === "running";
  const dayBars = activity.days.map((d) => d.messages);

  const providerRows: ProviderHealthRow[] = cr.providers.slice(0, 6).map((p) => {
    const perfP = perf.byProvider[p.id];
    return {
      id: p.id,
      status: p.status,
      p50: perfP ? perfP.p50 : null,
      series: perfP?.series ?? [],
    };
  });

  const cells: TickerCell[] = [
    {
      label: "p50 yanıt",
      value: perf.totalCalls ? perf.p50 : "—",
      unit: perf.totalCalls ? "s" : undefined,
      accent: latColor(perf.p50),
      chart: perf.series.length >= 2 ? <Sparkline data={perf.series} color={latColor(perf.p50)} w={70} h={22} /> : undefined,
    },
    {
      label: "toplam token",
      value: compactNum(activity.totalTokens),
      chart: dayBars.length ? <Bars data={dayBars} color="var(--color-cyan)" w={64} h={22} /> : undefined,
    },
    {
      label: "aktif ajan",
      value: liveAgents,
      accent: liveAgents ? "var(--color-green)" : "var(--color-faint)",
    },
    {
      label: "sağlayıcı sağlık",
      value: `${healthy}/${cr.providers.length}`,
      accent: healthy ? "var(--color-green)" : "var(--color-amber)",
    },
    {
      label: "gateway",
      value: gatewayUp ? "RUNNING" : cr.gateway.state,
      accent: gatewayUp ? "var(--color-green)" : "var(--color-faint)",
    },
    {
      label: "cache",
      value: perf.cacheHitPct != null ? `%${perf.cacheHitPct}` : "—",
    },
    {
      label: "son sinyal",
      value: relTime(activity.lastActivity),
    },
  ];

  return (
    <div className="hero-space relative flex h-full min-h-0 flex-col">
      <TelemetryTicker cells={cells} />

      <div className="relative min-h-[560px] flex-1 overflow-hidden">
        {/* signature centerpiece */}
        <div className="absolute inset-0">
          <Orrery agents={agents} />
        </div>

        {/* hero copy — left */}
        <div className="pointer-events-none absolute left-10 top-12 z-10 max-w-sm">
          <h1 className="font-display text-[64px] font-light leading-[0.96] tracking-tight">
            Mission
            <br />
            <span className="font-bold text-cyan">Control</span>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-muted">
            Her sistem, her model.
            <br />
            Tek akıllı yörünge.
          </p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan/40 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-cyan">
            <Sparkles className="h-3 w-3" />
            your agent stack, in orbit
          </span>
        </div>

        {/* stat chips — bottom-left */}
        <div className="pointer-events-none absolute bottom-10 left-10 z-10 flex gap-4">
          <HeroStat
            label="p50 yanıt"
            value={perf.totalCalls ? perf.p50 : "—"}
            unit={perf.totalCalls ? "s" : undefined}
            accent={latColor(perf.p50)}
            sub={perf.totalCalls ? `p95 ${perf.p95}s` : "veri yok"}
            chart={perf.series.length >= 2 ? <Sparkline data={perf.series} color={latColor(perf.p50)} w={148} h={26} /> : undefined}
          />
          <HeroStat
            label="toplam token"
            value={compactNum(activity.totalTokens)}
            accent="var(--color-fg)"
            sub={`${activity.totalSessions} oturum`}
            chart={dayBars.length ? <Bars data={dayBars} color="var(--color-cyan)" w={148} h={26} /> : undefined}
          />
          <HeroStat
            label="sağlayıcı sağlık"
            value={`${healthy}`}
            unit={`/${cr.providers.length}`}
            accent={healthy ? "var(--color-green)" : "var(--color-amber)"}
            sub={gatewayUp ? "gateway çalışıyor" : `gateway ${cr.gateway.state}`}
            chart={
              <div className="flex items-center gap-1.5">
                {cr.providers.map((p) => {
                  const c =
                    p.status === "ok"
                      ? "var(--color-green)"
                      : p.status === "exhausted"
                        ? "var(--color-amber)"
                        : p.status === "error"
                          ? "var(--color-red)"
                          : "var(--color-faint)";
                  return <span key={p.id} className="h-2 w-2 rounded-full" style={{ background: c }} />;
                })}
              </div>
            }
          />
        </div>

        {/* provider health — top-right */}
        <div className="absolute right-8 top-6 z-10">
          <ProviderHealthPanel rows={providerRows} />
        </div>
      </div>
    </div>
  );
}
