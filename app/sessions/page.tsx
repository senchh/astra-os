import Link from "next/link";
import { Hash, Coins, Wrench } from "lucide-react";
import {
  listSessions,
  searchSessions,
  readSessionDetail,
} from "@/lib/hermes/sessions";
import type { SessionListItem, SessionSearchHit } from "@/lib/hermes/types";
import SessionSearch from "@/components/sessions/session-search";

export const dynamic = "force-dynamic";

const SOURCES = ["cli", "cron", "telegram", "webui"] as const;

const SOURCE_COLOR: Record<string, string> = {
  cli: "var(--color-cyan)",
  cron: "var(--color-amber)",
  telegram: "var(--color-green)",
  webui: "var(--color-fg)",
};

function compact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

function relTime(sec: number): string {
  if (!sec) return "—";
  const s = Date.now() / 1000 - sec;
  if (s < 60) return "az önce";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)} dk`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)} sa`;
  return `${Math.floor(h / 24)} g`;
}

function fmtFull(sec: number): string {
  if (!sec) return "—";
  return new Date(sec * 1000).toLocaleString("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function href(params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const qs = sp.toString();
  return qs ? `/sessions?${qs}` : "/sessions";
}

// Render an FTS snippet, highlighting the [bracketed] matches.
function Snippet({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]*\])/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("[") && p.endsWith("]") ? (
          <mark key={i} className="rounded bg-cyan/25 px-0.5 text-fg">
            {p.slice(1, -1)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function SourceDot({ source }: { source: string }) {
  return (
    <span
      className="h-1.5 w-1.5 shrink-0 rounded-full"
      style={{ background: SOURCE_COLOR[source] ?? "var(--color-faint)" }}
    />
  );
}

function ListRow({
  item,
  q,
  source,
  activeId,
}: {
  item: SessionListItem | SessionSearchHit;
  q: string;
  source: string | null;
  activeId: string | null;
}) {
  const active = item.id === activeId;
  const hit = "snippet" in item ? item : null;
  return (
    <Link
      href={href({ q, source, id: item.id })}
      className={`block rounded-lg border px-3 py-2.5 transition-colors ${
        active
          ? "border-cyan/50 bg-cyan/10"
          : "border-transparent hover:border-edge hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <SourceDot source={item.source} />
        <span className="truncate text-sm text-fg">
          {item.title || "(başlıksız oturum)"}
        </span>
      </div>
      {hit && (
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted">
          <Snippet text={hit.snippet} />
        </p>
      )}
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.625rem] text-faint">
        <span className="uppercase tracking-wide">{item.source}</span>
        <span className="font-mono">{item.model}</span>
        <span>· {relTime(item.startedAt)}</span>
        <span>· {compact(item.totalTokens)} tok</span>
        {hit && <span className="text-cyan">· {hit.matchCount} eşleşme</span>}
      </div>
    </Link>
  );
}

const ROLE_META: Record<string, { label: string; color: string }> = {
  user: { label: "sen", color: "var(--color-cyan)" },
  assistant: { label: "ajan", color: "var(--color-green)" },
  tool: { label: "araç", color: "var(--color-amber)" },
  system: { label: "sistem", color: "var(--color-faint)" },
};

function Message({
  role,
  content,
  toolName,
  timestamp,
}: {
  role: string;
  content: string;
  toolName: string | null;
  timestamp: number;
}) {
  const meta = ROLE_META[role] ?? { label: role || "—", color: "var(--color-faint)" };
  const isTool = role === "tool";
  // Tool payloads (JSON blobs) are noise in a transcript — clamp hard; keep
  // user/assistant readable but bounded.
  const body = content.length > (isTool ? 600 : 6000)
    ? content.slice(0, isTool ? 600 : 6000) + "\n…"
    : content;
  return (
    <div className="border-t border-edge/50 py-3 first:border-t-0">
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className="label !text-[0.625rem]"
          style={{ color: meta.color }}
        >
          {meta.label}
          {isTool && toolName ? ` · ${toolName}` : ""}
        </span>
        <span className="text-[0.625rem] text-faint">{relTime(timestamp)}</span>
      </div>
      {body ? (
        <pre
          className={`whitespace-pre-wrap break-words font-sans text-sm leading-relaxed ${
            isTool ? "text-faint" : "text-fg"
          }`}
        >
          {body}
        </pre>
      ) : (
        <span className="text-xs text-faint">(boş)</span>
      )}
    </div>
  );
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; id?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const source = SOURCES.includes((sp.source ?? "") as (typeof SOURCES)[number])
    ? (sp.source as string)
    : null;
  const id = sp.id ?? null;

  const hits = q ? searchSessions(q, source) : [];
  const list = q ? [] : listSessions(source);
  const rows: (SessionListItem | SessionSearchHit)[] = q ? hits : list;
  const detail = id ? readSessionDetail(id) : null;

  return (
    <div className="flex h-full">
      {/* Master: search + filters + list */}
      <aside className="flex w-[22rem] shrink-0 flex-col border-r border-edge">
        <div className="space-y-3 p-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Oturumlar</h1>
            <p className="mt-0.5 text-xs text-muted">
              Tüm ajan etkinliğini ara — cli · cron · telegram · webui.
            </p>
          </div>

          <SessionSearch />

          <div className="flex flex-wrap gap-1.5">
            <Link
              href={href({ q, source: null })}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                !source
                  ? "border-cyan/50 bg-cyan/15 text-fg"
                  : "border-edge text-muted hover:text-fg"
              }`}
            >
              tümü
            </Link>
            {SOURCES.map((s) => (
              <Link
                key={s}
                href={href({ q, source: source === s ? null : s })}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  source === s
                    ? "border-cyan/50 bg-cyan/15 text-fg"
                    : "border-edge text-muted hover:text-fg"
                }`}
              >
                <SourceDot source={s} />
                {s}
              </Link>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
          {q && (
            <p className="px-2 py-1 text-[0.625rem] uppercase tracking-wide text-faint">
              {rows.length} oturum · “{q}”
            </p>
          )}
          {rows.length === 0 ? (
            <p className="px-2 py-8 text-center text-xs text-faint">
              {q ? "Eşleşen oturum yok." : "Oturum yok."}
            </p>
          ) : (
            rows.map((r) => (
              <ListRow key={r.id} item={r} q={q} source={source} activeId={id} />
            ))
          )}
        </div>
      </aside>

      {/* Detail */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        {!detail ? (
          <div className="grid h-full place-items-center text-center text-sm text-faint">
            <p>
              Bir oturum seç.
              <br />
              <span className="text-xs">Soldan ara veya listeden tıkla.</span>
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl p-6">
            <div className="flex items-center gap-2">
              <SourceDot source={detail.meta.source} />
              <h2 className="text-xl font-semibold tracking-tight">
                {detail.meta.title || "(başlıksız oturum)"}
              </h2>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="uppercase tracking-wide">{detail.meta.source}</span>
              <span className="font-mono">{detail.meta.model}</span>
              <span>· {detail.meta.provider}</span>
              <span>· {fmtFull(detail.meta.startedAt)}</span>
              {detail.meta.endReason && <span>· {detail.meta.endReason}</span>}
            </div>

            {/* Observability strip: the reference's Sessions list shows none of this. */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="panel flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted">
                <Hash className="h-3 w-3 text-faint" />
                {detail.meta.messageCount} mesaj
              </span>
              <span className="panel flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted">
                <Coins className="h-3 w-3 text-faint" />
                {compact(detail.meta.totalTokens)} token
              </span>
              <span className="panel flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted">
                <Wrench className="h-3 w-3 text-faint" />
                {detail.meta.toolCalls} araç çağrısı
              </span>
              <span className="panel flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted">
                {detail.meta.costLabel}
              </span>
            </div>

            <div className="mt-5">
              {detail.messages.length === 0 ? (
                <p className="text-sm text-faint">Bu oturumda mesaj yok.</p>
              ) : (
                detail.messages.map((m) => (
                  <Message
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    toolName={m.toolName}
                    timestamp={m.timestamp}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
