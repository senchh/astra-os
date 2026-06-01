export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Compact number: 1234 → "1.2K", 30_500_000 → "30.5M". */
export function compactNum(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
  if (abs >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  if (abs >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
  return String(Math.round(n));
}

/** Compact "x ago" / "in x" from an ISO string or epoch ms/seconds. */
export function relTime(input: string | number | null | undefined): string {
  if (input === null || input === undefined || input === "") return "—";
  let ms: number;
  if (typeof input === "number") {
    ms = input < 1e12 ? input * 1000 : input; // seconds vs ms
  } else {
    const n = Number(input);
    ms = Number.isFinite(n) ? (n < 1e12 ? n * 1000 : n) : Date.parse(input);
  }
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  const future = diff < 0;
  const s = Math.abs(diff) / 1000;
  const units: [number, string][] = [
    [60, "sn"],
    [60, "dk"],
    [24, "sa"],
    [7, "g"],
    [4.345, "hf"],
    [12, "ay"],
    [Number.POSITIVE_INFINITY, "yıl"],
  ];
  let val = s;
  let unit = "sn";
  for (const [step, u] of units) {
    if (val < step) {
      unit = u;
      break;
    }
    val /= step;
    unit = u;
  }
  const r = Math.max(1, Math.round(val));
  return future ? `${r}${unit} sonra` : `${r}${unit} önce`;
}
