"use client";

import { useEffect } from "react";

// Global cursor-spotlight driver. One passive pointermove listener writes the
// cursor position (relative to the hovered card) into CSS vars, which the
// `.panel-hover::before` masked-gradient ring reads. rAF-throttled, and it only
// ever touches the single card under the pointer — cheap regardless of how many
// panels are on screen.
export function SurfaceFX() {
  useEffect(() => {
    if (window.matchMedia("(pointer: coarse)").matches) return; // skip on touch

    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.(".panel-hover") as
        | HTMLElement
        | null;
      if (!el || raf) return;
      const x = e.clientX;
      const y = e.clientY;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--spot-x", `${x - r.left}px`);
        el.style.setProperty("--spot-y", `${y - r.top}px`);
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
