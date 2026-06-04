"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Command } from "lucide-react";

function openPalette() {
  window.dispatchEvent(new CustomEvent("astra:palette"));
}

const TITLES: Record<string, string> = {
  "/": "Mission Control",
  "/control": "Control Room",
  "/activity": "Activity",
  "/sessions": "Sessions",
  "/chat": "Hermes",
  "/run": "Run",
  "/board": "Board",
  "/cron": "Cron",
  "/tools": "Tools",
  "/skills": "Skills",
  "/profiles": "Profiles",
  "/memory": "Memory",
  "/dream": "Dream",
  "/goals": "Goals",
  "/settings": "Settings",
};

function titleFor(path: string): string {
  if (path === "/") return TITLES["/"];
  const key = Object.keys(TITLES)
    .filter((k) => k !== "/")
    .find((k) => path.startsWith(k));
  return key ? TITLES[key] : "Astra OS";
}

export function TopBar() {
  const pathname = usePathname();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    // Defer the first set out of the effect body (avoids cascading-render
    // lint) while still painting the clock within a frame.
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const time = now
    ? now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";
  const date = now
    ? now.toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })
    : "";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-edge bg-bg-2/50 px-5">
      <div className="flex items-center gap-2.5">
        <span className="label">operator</span>
        <span className="text-faint">/</span>
        <span className="text-faint">local</span>
        <span className="text-faint">/</span>
        <span className="text-sm font-medium text-fg">{titleFor(pathname)}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-edge bg-panel px-3 py-1.5 sm:flex">
          <span className="relative inline-flex h-1.5 w-1.5">
            <span className="absolute inset-0 animate-ping rounded-full bg-green-400/60" />
            <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-green-400" />
          </span>
          <span className="label !text-green-400">all systems</span>
        </div>

        <div className="hidden flex-col items-end leading-tight sm:flex">
          <span className="font-mono text-sm tabular-nums text-fg">{time}</span>
          <span className="label">{date}</span>
        </div>

        <button
          onClick={openPalette}
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-panel px-2.5 py-1.5 text-muted transition-colors hover:border-cyan/40 hover:text-fg"
          title="Komut paleti"
        >
          <Command className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">K</span>
        </button>
      </div>
    </header>
  );
}
