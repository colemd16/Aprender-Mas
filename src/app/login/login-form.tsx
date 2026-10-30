"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Dot } from "@/components/ui/pill";
import { Spinner } from "@/components/ui/spinner";
import { signIn } from "./actions";

const fieldClasses =
  "h-[52px] w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-base font-medium text-fg outline-none " +
  "transition-[border-color,box-shadow] duration-200 placeholder:text-fg-faint focus:border-accent focus:shadow-[0_0_0_4px_rgb(252_209_22/0.15)]";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);

  return (
    <form
      // A new key per failed attempt replays the shake animation.
      key={state?.attempt}
      action={action}
      className={`glass flex flex-[1_1_320px] flex-col gap-4 rounded-3xl p-6 sm:max-w-[400px] sm:flex-[0_1_400px] sm:gap-[18px] sm:p-8 ${state?.error ? "animate-shake" : "animate-rise [animation-delay:120ms]"}`}
    >
      <h1 className="m-0 mb-1 text-[26px] font-semibold tracking-[-0.03em]">Welcome back</h1>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-[13px] font-medium text-fg-soft">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email} placeholder="you@example.com" className={fieldClasses} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-[13px] font-medium text-fg-soft">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className={fieldClasses} />
      </div>

      {state?.error && (
        <div role="alert" className="flex items-center gap-2.5 rounded-xl bg-bad/10 px-3.5 py-3 text-sm text-bad-soft">
          <Dot className="text-bad" />
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? (
          <>
            <Spinner />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="m-0 text-center text-[13px] leading-normal text-fg-subtle">Private app — accounts are created by invitation.</p>
    </form>
  );
}
