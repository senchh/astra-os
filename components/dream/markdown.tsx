import { Fragment } from "react";

/**
 * Deliberately tiny markdown renderer for Dream reports: headings, bullet
 * lists, bold, inline code and paragraphs. Not a full parser — Dream reports
 * are simple. Avoids pulling a markdown dependency for one read-only view.
 */
function inline(text: string, key: string) {
  // **bold** and `code` — split on whichever appears, keep order.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**"))
      return (
        <strong key={`${key}-${i}`} className="font-semibold text-fg">
          {p.slice(2, -2)}
        </strong>
      );
    if (p.startsWith("`") && p.endsWith("`"))
      return (
        <code
          key={`${key}-${i}`}
          className="rounded bg-bg-2 px-1.5 py-0.5 font-mono text-[0.8em] text-cyan"
        >
          {p.slice(1, -1)}
        </code>
      );
    return <Fragment key={`${key}-${i}`}>{p}</Fragment>;
  });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (!list.length) return;
    const items = [...list];
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="my-3 space-y-1.5 pl-1">
        {items.map((li, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" />
            <span>{inline(li, `li-${blocks.length}-${i}`)}</span>
          </li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.*)$/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList();

    const h = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level <= 1
          ? "mt-5 mb-2 text-lg font-semibold text-fg"
          : level === 2
            ? "mt-5 mb-2 text-base font-semibold text-fg"
            : "mt-4 mb-1.5 label";
      blocks.push(
        <p key={`h-${idx}`} className={cls}>
          {inline(h[2], `h-${idx}`)}
        </p>
      );
      return;
    }

    blocks.push(
      <p key={`p-${idx}`} className="my-2 text-sm leading-relaxed text-muted">
        {inline(trimmed, `p-${idx}`)}
      </p>
    );
  });
  flushList();

  return <div className="first:[&>*]:mt-0">{blocks}</div>;
}
