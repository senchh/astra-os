"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Search box for /sessions. Navigates by URL (?q=…) so the list + detail stay
 * server-rendered (the app's server-reader pattern). A new search drops the
 * selected session but keeps the active source filter.
 */
export default function SessionSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const source = sp.get("source");
  const [q, setQ] = useState(sp.get("q") ?? "");

  function go(query: string) {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (source) params.set("source", source);
    const qs = params.toString();
    router.push(qs ? `/sessions?${qs}` : "/sessions");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        go(q);
      }}
      className="relative"
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tüm oturumlarda ara…"
        className="w-full rounded-lg border border-edge bg-transparent py-2 pl-8 pr-8 text-sm text-fg outline-none placeholder:text-faint focus:border-cyan/40"
      />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            go("");
          }}
          title="Temizle"
          className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-faint hover:text-fg"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </form>
  );
}
