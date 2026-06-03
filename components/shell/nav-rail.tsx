"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Orbit, Clock, Activity, Moon, Target, MessageSquare, SlidersHorizontal, KanbanSquare, Wrench, Brain, Settings, Users, Blocks, History } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Mission Control", icon: Orbit },
  { href: "/chat", label: "Hermes", icon: MessageSquare },
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/control", label: "Control Room", icon: SlidersHorizontal },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/tools", label: "Tools", icon: Wrench },
  { href: "/skills", label: "Skills", icon: Blocks },
  { href: "/cron", label: "Cron", icon: Clock },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/sessions", label: "Sessions", icon: History },
  { href: "/dream", label: "Dream", icon: Moon },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/profiles", label: "Profiles", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavRail() {
  const pathname = usePathname();
  return (
    <nav className="flex h-full w-16 shrink-0 flex-col items-center gap-1 border-r border-edge bg-bg-2/60 py-4">
      <Link
        href="/"
        className="mb-4 grid h-10 w-10 place-items-center rounded-xl border border-edge bg-panel"
        title="Astra OS"
      >
        <Orbit className="h-5 w-5 text-cyan" strokeWidth={1.75} />
      </Link>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            title={label}
            className={cn(
              "group relative grid h-11 w-11 place-items-center rounded-xl transition-colors",
              active
                ? "bg-panel text-cyan"
                : "text-faint hover:bg-panel/60 hover:text-fg"
            )}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-cyan" />
            )}
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}
