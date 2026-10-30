"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// A session's date and time in the viewer's own time zone (rendered in the browser).
export function SessionDate({ iso }: { iso: string }) {
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  if (!ready) return <span>&nbsp;</span>;
  const d = new Date(iso);
  return (
    <time dateTime={iso}>
      {d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
    </time>
  );
}
