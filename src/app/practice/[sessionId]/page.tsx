import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { PracticeSession } from "@/components/practice/practice-session";
import { getOwnedSession, getSessionPlan, getStepSolidCount } from "@/data/practice";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Practice · Aprender Más" };

export default function PracticePage({ params }: PageProps<"/practice/[sessionId]">) {
  return (
    <Suspense fallback={<PracticeSkeleton />}>
      <Practice params={params} />
    </Suspense>
  );
}

async function Practice({ params }: { params: PageProps<"/practice/[sessionId]">["params"] }) {
  const { sessionId } = await params;
  const user = await getCurrentUser();
  const session = await getOwnedSession(user.id, sessionId);
  if (!session) notFound();
  if (session.endedAt) redirect(session.stepId ? `/steps/${session.stepId}` : "/");

  const [items, progress] = await Promise.all([
    getSessionPlan(user.id, session),
    session.kind === "learn" && session.stepId ? getStepSolidCount(user.id, session.stepId) : null,
  ]);

  return (
    <PracticeSession
      sessionId={session.id}
      kind={session.kind}
      stepId={session.stepId}
      stepTitle={session.stepTitle ?? "Practice"}
      levelId={session.levelId}
      items={items}
      progress={progress}
    />
  );
}

function PracticeSkeleton() {
  return (
    <main aria-busy="true" aria-label="Preparing your session" className="mx-auto flex min-h-screen w-full max-w-[840px] flex-col justify-center gap-8 px-5 sm:px-8">
      <div className="h-7 w-40 animate-pulse rounded-full bg-white/[0.05]" />
      <div className="h-14 w-[min(520px,90%)] animate-pulse rounded-xl bg-white/[0.05]" />
      <div className="h-[92px] animate-pulse rounded-[22px] bg-white/[0.04]" />
    </main>
  );
}
