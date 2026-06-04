export function StatCard({
  label,
  value,
  sub,
  accent = "var(--color-cyan)",
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="panel panel-hover relative overflow-hidden p-4">
      {/* corner gradient tint (Mert-style) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(130% 110% at 100% 0%, color-mix(in oklab, ${accent} 16%, transparent), transparent 60%)`,
        }}
      />
      <span
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: accent, boxShadow: `0 0 14px ${accent}` }}
      />
      <div className="relative">
        <div className="label">{label}</div>
        <div className="mt-2.5 font-display text-[28px] font-semibold leading-none tracking-tight tabular-nums">
          {value}
        </div>
        {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
      </div>
    </div>
  );
}
