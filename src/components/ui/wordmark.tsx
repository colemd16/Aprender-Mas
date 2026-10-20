import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[-0.02em] text-fg no-underline">
      <span aria-hidden="true" className="size-2.5 rounded-[3px] bg-accent shadow-[0_0_14px_rgb(142_162_255/0.7)]" />
      aprender más
    </Link>
  );
}
