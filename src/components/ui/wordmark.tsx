import Link from "next/link";

// The wordmark, with a tiny Colombian flag (yellow, blue, red — 2 : 1 : 1) as its mark.
export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em] text-fg no-underline">
      <span
        aria-hidden="true"
        className="flex h-[11px] w-[15px] flex-col overflow-hidden rounded-[3px] shadow-[0_0_14px_rgb(252_209_22/0.55)]"
      >
        <span className="h-1/2 bg-flag-yellow" />
        <span className="h-1/4 bg-flag-blue" />
        <span className="h-1/4 bg-flag-red" />
      </span>
      aprender más
    </Link>
  );
}
