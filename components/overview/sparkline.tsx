// Tiny presentational charts (pure SVG, server-renderable) fed by real series.

function norm(values: number[], h: number, pad = 1.5): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v) => pad + (1 - (v - min) / span) * (h - pad * 2));
}

export function Sparkline({
  data,
  color = "var(--color-cyan)",
  w = 90,
  h = 26,
  strokeWidth = 1.5,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
  strokeWidth?: number;
}) {
  if (data.length < 2) return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} />;
  const ys = norm(data, h);
  const step = w / (data.length - 1);
  const pts = ys.map((y, i) => `${(i * step).toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Vertical bars (used for the token chart in the ticker).
export function Bars({
  data,
  color = "var(--color-cyan)",
  w = 70,
  h = 26,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  if (data.length === 0) return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} />;
  const max = Math.max(...data) || 1;
  const bw = w / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((v, i) => {
        const bh = Math.max(1.5, (v / max) * (h - 2));
        return (
          <rect
            key={i}
            x={i * bw + bw * 0.18}
            y={h - bh}
            width={bw * 0.64}
            height={bh}
            rx={0.6}
            fill={color}
            opacity={0.35 + 0.65 * (v / max)}
          />
        );
      })}
    </svg>
  );
}
