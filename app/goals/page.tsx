import { Target } from "lucide-react";
import { readGoals } from "@/lib/hermes/goals";
import { StatCard } from "@/components/overview/stat-card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  const goals = readGoals();
  const done = goals.filter((g) => g.done).length;
  const total = goals.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted">
          Obsidian vault&apos;una bağlı hedefler.
        </p>
      </header>

      {total === 0 ? (
        <div className="panel flex flex-col items-center gap-3 p-12 text-center">
          <Target className="h-8 w-8 text-faint" strokeWidth={1.5} />
          <p className="text-sm text-muted">
            Henüz hedef yok.
            <br />
            <span className="text-faint">
              Vault&apos;ta <code className="font-mono text-cyan">Goals.md</code>{" "}
              oluştur ve markdown checkbox&apos;ları ekle:
            </span>
          </p>
          <pre className="mt-1 rounded-lg bg-bg-2 px-4 py-3 text-left font-mono text-xs text-muted">
            {`- [ ] 5.000 X takipçisine ulaş\n- [x] Astra OS v0 yayında`}
          </pre>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-4">
            <StatCard label="toplam" value={total} accent="var(--color-cyan)" />
            <StatCard label="tamamlanan" value={done} accent="var(--color-green)" />
            <StatCard label="ilerleme" value={`%${pct}`} accent="var(--color-violet)" />
          </section>

          <section className="panel p-5">
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-bg-2">
              <div
                className="h-full rounded-full bg-green transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <ul className="divide-y divide-edge">
              {goals.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-3 text-sm">
                  <span
                    className="grid h-4 w-4 shrink-0 place-items-center rounded border text-[0.65rem]"
                    style={{
                      borderColor: g.done ? "var(--color-green)" : "var(--color-edge)",
                      color: "var(--color-green)",
                    }}
                  >
                    {g.done ? "✓" : ""}
                  </span>
                  <span className={g.done ? "text-faint line-through" : "text-fg"}>
                    {g.title}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
