import type { Metadata } from "next";
import { Wordmark } from "@/components/ui/wordmark";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · Aprender Más" };

// Spanish lines that cycle above the tagline; each gets a 3-second slot in a 12s loop.
const PHRASES = [
  { text: "Estábamos.", accent: false },
  { text: "Habría sido.", accent: true },
  { text: "Si hubiera sabido…", accent: false },
  { text: "Vamos a estar.", accent: true },
];

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(800px_500px_at_30%_40%,rgb(142_162_255/0.11),transparent_70%)]">
      <header className="px-8 py-6">
        <Wordmark />
      </header>

      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-wrap items-center justify-center gap-x-24 gap-y-14 p-8">
        <div className="flex flex-[1_1_380px] animate-rise flex-col gap-7">
          <div aria-hidden="true" lang="es" className="grid text-[clamp(44px,6vw,64px)] leading-[1.1] font-semibold tracking-[-0.04em]">
            {PHRASES.map((p, i) => (
              <span
                key={p.text}
                className={`animate-phrase-cycle [grid-area:1/1] self-end opacity-0 ${p.accent ? "text-accent-bright" : ""}`}
                style={{ animationDelay: `${i * 3}s` }}
              >
                {p.text}
              </span>
            ))}
          </div>
          <p className="m-0 max-w-[440px] text-[19px] leading-relaxed text-fg-muted">
            Grammar for real fluency. Every tense, every person — typed or spoken, never picked from a list.
          </p>
        </div>

        <LoginForm />
      </main>
    </div>
  );
}
