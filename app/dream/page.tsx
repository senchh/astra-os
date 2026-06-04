import Link from "next/link";
import { Moon } from "lucide-react";
import { readDreams } from "@/lib/hermes/dreams";
import { relTime } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const dreams = readDreams(30);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <header>
        <h1 className="font-display text-[26px] font-semibold tracking-tight">Dream</h1>
        <p className="mt-1 text-sm text-muted">
          Gece üretilen rüya raporları — örüntü analizi ve iyileştirmeler.
        </p>
      </header>

      {dreams.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Moon className="h-8 w-8 text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">
            Henüz rüya raporu yok.
            <br />
            <span className="text-faint">
              daily-dream cron&apos;u 06:00&apos;da çalışır → ~/Documents/HermesMemory/Daily Dream Reports/
            </span>
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {dreams.map((d) => (
            <Link
              key={d.slug}
              href={`/dream/${d.slug}`}
              className="panel panel-hover block p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="min-w-0 truncate text-sm font-medium text-fg">{d.title}</h2>
                <span className="shrink-0 label">{relTime(d.date)}</span>
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted">
                {d.excerpt}
              </p>
              <span className="mt-2 inline-block font-mono text-[0.625rem] text-faint">
                {d.date}
              </span>
            </Link>
          ))}
        </section>
      )}
    </div>
  );
}
