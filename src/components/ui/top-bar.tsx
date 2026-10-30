import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

// The bar across the top of a screen. On phones it stays put under the status bar
// (frosted, so the page scrolls beneath it); on larger screens it's part of the page.
export function TopBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header
      className={cn(
        "sticky top-[calc(env(safe-area-inset-top)+3px)] z-40 flex min-h-14 items-center justify-between gap-3 border-b border-white/[0.06] bg-night/70 px-4 py-2 backdrop-blur-xl",
        "sm:static sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-8 sm:py-5 sm:backdrop-blur-none",
        className,
      )}
    >
      {children}
    </header>
  );
}

// "‹ Journey" — back to where this screen was opened from. First in the bar on phones,
// where back lives in apps; last on larger screens.
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-2 flex h-10 items-center gap-1 rounded-xl px-2 text-[15px] font-medium text-fg-soft no-underline transition-colors duration-200 hover:text-fg active:text-fg sm:order-last sm:ml-0 sm:text-sm"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="sm:hidden"
      >
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {children}
    </Link>
  );
}
