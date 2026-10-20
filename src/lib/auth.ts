import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { createSupabaseServerClient } from "./supabase/server";

export type CurrentUser = { id: string; email: string | null };

// The one place the app asks "who is signed in?". The id returned here is what every
// query must filter by, because the app's database connection bypasses RLS.
// With Cache Components, call this from inside a <Suspense> boundary (it reads cookies).
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  // Checking the session compares the token's expiry with the current time, which
  // Next.js forbids while it prefetches a page ahead of navigation. connection() makes
  // everything after it wait for the real request. (In server actions it's a no-op.)
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims.sub) redirect("/login");
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});
