"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// `attempt` changes on every failure so the form can replay its shake animation.
export type SignInState = { error: string; email: string; attempt: number } | undefined;

export async function signIn(prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const attempt = (prev?.attempt ?? 0) + 1;
  if (!email || !password) return { error: "Enter your email and password.", email, attempt };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message = error.code === "invalid_credentials" ? "That email and password don't match." : error.message;
    return { error: message, email, attempt };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
