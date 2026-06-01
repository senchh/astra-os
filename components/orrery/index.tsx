"use client";

import dynamic from "next/dynamic";
import type { AgentHealth } from "@/lib/hermes/types";

const OrreryScene = dynamic(() => import("./scene").then((m) => m.OrreryScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-edge border-t-cyan" />
    </div>
  ),
});

export function Orrery({ agents }: { agents: AgentHealth[] }) {
  return <OrreryScene agents={agents} />;
}
