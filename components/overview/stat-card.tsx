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
      <span
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: accent, boxShadow: `0 0 14px ${accent}` }}
      />
      <div className="label">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
