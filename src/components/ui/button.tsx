import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "light" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 font-semibold no-underline cursor-pointer select-none " +
  "transition-[transform,filter] duration-200 ease-spring hover:-translate-y-px hover:brightness-110 active:scale-[0.97] " +
  "disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:brightness-100";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-night glow-accent",
  secondary: "border border-white/12 bg-transparent text-fg",
  light: "bg-fg text-night",
  ghost: "bg-transparent text-fg-soft hover:text-fg",
};

const sizes: Record<Size, string> = {
  md: "h-12 px-5 rounded-[14px] text-[15px]",
  lg: "h-[52px] px-6 rounded-2xl text-base",
};

type Common = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function buttonClasses({ variant = "primary", size = "md", className }: Omit<Common, "children">) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({ variant, size, className, ...props }: Common & ComponentProps<"button">) {
  return <button type="button" className={buttonClasses({ variant, size, className })} {...props} />;
}

export function ButtonLink({ variant, size, className, ...props }: Common & ComponentProps<typeof Link>) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
