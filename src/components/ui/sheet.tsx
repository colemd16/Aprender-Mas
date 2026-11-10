"use client";

import { useEffect, useRef, type ReactNode } from "react";

// A panel over the page: it slides up from the bottom on phones and is a centered card on
// larger screens. A native modal dialog, so Escape closes it, focus stays inside, and it
// sits above everything (no transformed parent can trap it). Tapping outside closes it.
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="m-0 mt-auto max-h-[88dvh] w-full max-w-full overflow-y-auto overscroll-contain rounded-t-[26px] border border-white/10 bg-[#0b1433] p-0 text-fg shadow-[0_-24px_70px_rgb(0_0_0/0.55)] backdrop:bg-black/60 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-[580px] sm:rounded-[26px]"
    >
      {open && (
        <div className="flex animate-rise flex-col gap-5 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+22px)] sm:px-7 sm:pt-6 sm:pb-7">
          <div aria-hidden="true" className="mx-auto h-1 w-10 flex-none rounded-full bg-white/20 sm:hidden" />
          <div className="flex items-start justify-between gap-4">
            <h2 className="m-0 text-xl leading-tight font-semibold tracking-[-0.02em]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mt-1 -mr-2 flex size-9 flex-none cursor-pointer items-center justify-center rounded-full text-fg-soft transition-[transform,color] duration-200 ease-spring hover:text-fg active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}
