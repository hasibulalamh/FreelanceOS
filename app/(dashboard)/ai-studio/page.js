import Link from "next/link";
import { Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { KeywordResearchPanel } from "@/components/ai/keyword-research-panel";
import { isAiConfigured } from "@/services/ai/config";

export const dynamic = "force-dynamic";

export const metadata = { title: "AI Studio — FreelanceOS" };

function recentLabel(generation) {
  const when = new Date(generation.createdAt).toLocaleString();
  if (generation.status === "COMPLETED") {
    return `${when} · ${generation.output?.keywords?.length ?? 0} keywords`;
  }
  return `${when} · failed`;
}

export default async function AiStudioPage() {
  const session = await auth();
  const userId = session.user.id;

  const [profile, recentGenerations] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: {
        professionalTitle: true,
        _count: { select: { skills: true, services: true, projects: true } },
      },
    }),
    prisma.aiGeneration.findMany({
      where: { userId, kind: "KEYWORD_RESEARCH" },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const configured = isAiConfigured();
  const hasProfileData =
    Boolean(profile?.professionalTitle) &&
    (profile?._count?.skills ?? 0) > 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">AI Studio</h1>
          <Badge tone={configured ? "green" : "amber"}>
            {configured ? "Gemini connected" : "Not configured"}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Gemini-powered modules over your own data. AI proposes — you review,
          edit, and apply everything manually.
        </p>
      </header>

      {!configured ? (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            AI is not configured on this deployment. Set{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
              GEMINI_API_KEY
            </code>{" "}
            (see <code className="text-xs">.env.example</code>) to enable AI
            Studio modules. Everything else keeps working without it.
          </p>
        </Card>
      ) : null}

      {!hasProfileData ? (
        <Card className="border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-800">
            Keyword research works best with a professional title and a few
            skills.{" "}
            <Link href="/profile" className="font-medium underline">
              Fill in your profile
            </Link>{" "}
            first — the analysis is only as honest as the data behind it.
          </p>
        </Card>
      ) : null}

      <KeywordResearchPanel />

      <Card>
        <CardHeader
          title="Recent keyword research"
          subtitle="Real, auditable generation history"
        />
        {recentGenerations.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No generations yet"
            description="Run your first keyword research above — results are stored with model, prompt version, and token usage."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentGenerations.map((generation) => (
              <li
                key={generation.id}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-800">
                    {generation.output?.keywords?.[0]?.keyword
                      ? `“${generation.output.keywords[0].keyword}” +${
                          (generation.output.keywords?.length ?? 1) - 1
                        } more`
                      : "Keyword research"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {recentLabel(generation)}
                  </p>
                </div>
                <Badge tone={generation.status === "COMPLETED" ? "green" : "red"}>
                  {generation.status.toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
