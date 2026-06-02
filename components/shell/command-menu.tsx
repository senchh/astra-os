"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Orbit, Clock, Activity, Moon, Target, MessageSquare, SlidersHorizontal, KanbanSquare, Wrench, Brain, Settings, Users } from "lucide-react";

const ITEMS = [
  { href: "/", label: "Mission Control", icon: Orbit, hint: "genel bakış · orrery" },
  { href: "/chat", label: "Hermes", icon: MessageSquare, hint: "canlı sohbet · sesli" },
  { href: "/board", label: "Board", icon: KanbanSquare, hint: "kanban · görev panosu" },
  { href: "/control", label: "Control Room", icon: SlidersHorizontal, hint: "sağlayıcı · anahtar · gateway" },
  { href: "/memory", label: "Memory", icon: Brain, hint: "notlar · profil · persona (soul)" },
  { href: "/tools", label: "Tools", icon: Wrench, hint: "araç setleri · aç/kapat" },
  { href: "/cron", label: "Cron", icon: Clock, hint: "zamanlanmış görevler" },
  { href: "/activity", label: "Activity", icon: Activity, hint: "session & model analizi" },
  { href: "/dream", label: "Dream", icon: Moon, hint: "rüya raporları" },
  { href: "/goals", label: "Goals", icon: Target, hint: "hedefler" },
  { href: "/profiles", label: "Profiles", icon: Users, hint: "profiller · aktif değiştir" },
  { href: "/settings", label: "Settings", icon: Settings, hint: "ajan davranışı · persona · görünüm" },
];

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvent = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("astra:palette", onEvent);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("astra:palette", onEvent);
    };
  }, []);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[18vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        label="Komut paleti"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-edge bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          autoFocus
          placeholder="Bir yere git veya ara…"
          className="w-full border-b border-edge bg-transparent px-4 py-3.5 text-sm text-fg outline-none placeholder:text-faint"
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
            Sonuç yok.
          </Command.Empty>
          <Command.Group
            heading="Git"
            className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:label"
          >
            {ITEMS.map(({ href, label, icon: Icon, hint }) => (
              <Command.Item
                key={href}
                value={`${label} ${hint}`}
                onSelect={() => go(href)}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted aria-selected:bg-panel-2 aria-selected:text-fg"
              >
                <Icon className="h-4 w-4 text-cyan" strokeWidth={1.75} />
                <span className="text-fg">{label}</span>
                <span className="ml-auto text-xs text-faint">{hint}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  );
}
