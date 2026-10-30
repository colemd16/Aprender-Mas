"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// A sideways-scrolling row that opens with its [data-center] child in the middle — so
// on a phone the level you're on is in view, not off past the edge.
export function CenterScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    const target = row?.querySelector<HTMLElement>("[data-center]");
    if (!row || !target || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = target.offsetLeft - row.clientWidth / 2 + target.offsetWidth / 2;
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
