"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Orbit,
  Clock,
  Activity,
  Moon,
  Target,
  MessageSquare,
  SlidersHorizontal,
  KanbanSquare,
  Wrench,
  Brain,
  Settings,
  Users,
  Blocks,
  History,
  Rocket,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof Orbit };

// Mert-style labelled sidebar (sectioned), Astra-themed.
const SECTIONS: { label: string; items: Item[] }[] = [
  {
    label: "Mission",
    items: [
      { href: "/", label: "Mission Control", icon: Orbit },
      { href: "/control", label: "Control Room", icon: SlidersHorizontal },
      { href: "/activity", label: "Activity", icon: Activity },
      { href: "/sessions", label: "Sessions", icon: History },
    ],
  },
  {
    label: "Operate",
    items: [
      { href: "/chat", label: "Hermes", icon: MessageSquare },
      { href: "/run", label: "Run", icon: Rocket },
      { href: "/board", label: "Board", icon: KanbanSquare },
      { href: "/cron", label: "Cron", icon: Clock },
    ],
  },
  {
    label: "Build",
    items: [
      { href: "/tools", label: "Tools", icon: Wrench },
      { href: "/skills", label: "Skills", icon: Blocks },
      { href: "/profiles", label: "Profiles", icon: Users },
    ],
  },
  {
    label: "Self",
    items: [
      { href: "/memory", label: "Memory", icon: Brain },
      { href: "/dream", label: "Dream", icon: Moon },
      { href: "/goals", label: "Goals", icon: Target },
    ],
  },
];

// Agent identities (brand-coloured), like Mert's AGENTS block.
const AGENTS = [
  { name: "Claude", color: "var(--color-claude)", role: "orchestrator" },
  { name: "Hermes", color: "var(--color-hermes)", role: "gateway" },
  { name: "OpenClaw", color: "var(--color-openclaw)", role: "runtime" },
  { name: "Obsidian", color: "var(--color-obsidian)", role: "memory" },
];

function NavItem({ href, label, icon: Icon, active }: Item & { active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors",
        active ? "bg-panel text-fg" : "text-muted hover:bg-panel/50 hover:text-fg"
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cyan" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-cyan" : "text-faint")} strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function NavRail() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <nav className="flex h-full w-[208px] shrink-0 flex-col border-r border-edge bg-bg-2/50 backdrop-blur-xl">
      {/* wordmark */}
      <Link href="/" className="flex h-[52px] shrink-0 items-center gap-2.5 border-b border-edge/60 px-4">
        <span className="grid h-7 w-7 place-items-center rounded-lg border border-edge bg-panel">
          <Orbit className="h-4 w-4 text-cyan" strokeWidth={2} />
        </span>
        <span className="font-display text-[15px] font-bold tracking-wide">
          ASTRA <span className="text-cyan">OS</span>
        </span>
      </Link>

      {/* sections */}
      <div className="flex-1 space-y-5 overflow-y-auto px-2.5 py-4">
        {SECTIONS.map((sec) => (
          <div key={sec.label}>
            <div className="label mb-1.5 px-2.5">{sec.label}</div>
            <div className="space-y-0.5">
              {sec.items.map((it) => (
                <NavItem key={it.href} {...it} active={isActive(it.href)} />
              ))}
            </div>
          </div>
        ))}

        {/* agents */}
        <div>
          <div className="label mb-1.5 px-2.5">Agents</div>
          <div className="space-y-0.5">
            {AGENTS.map((a) => (
              <Link
                key={a.name}
                href="/chat"
                className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-muted transition-colors hover:bg-panel/50 hover:text-fg"
              >
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color, boxShadow: `0 0 7px ${a.color}` }} />
                <span className="truncate">{a.name}</span>
                <span className="ml-auto text-[10px] text-faint">{a.role}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* settings + operator card */}
      <div className="shrink-0 border-t border-edge/60 p-2.5">
        <NavItem href="/settings" label="Settings" icon={Settings} active={isActive("/settings")} />
        <div className="mt-1.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-panel text-[11px] font-semibold text-cyan">
            OP
          </span>
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium text-fg">Operator</div>
            <div className="text-[10px] text-faint">local</div>
          </div>
        </div>
      </div>
    </nav>
  );
}
