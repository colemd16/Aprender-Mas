import { signOut } from "@/app/login/actions";

// Sign out: an icon on phones, a word on larger screens.
export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        aria-label="Sign out"
        className="-mr-2 flex size-10 cursor-pointer items-center justify-center rounded-xl text-[13px] font-medium text-fg-soft transition-colors duration-200 hover:text-fg active:text-fg sm:mr-0 sm:h-9 sm:w-auto sm:px-3"
      >
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="sm:hidden"
        >
          <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H4" />
        </svg>
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </form>
  );
}
