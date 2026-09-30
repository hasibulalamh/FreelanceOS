import Link from "next/link";
import { ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, Badge, EmptyState } from "@/components/ui";
import { FreelancerCardActions } from "@/components/platforms/freelancer-card-actions";
import { isConfigured as freelancerConfigured } from "@/services/platforms/freelancer/config";

export const dynamic = "force-dynamic";

const CAPABILITY_LABELS = {
  PROFILE_SYNC: "Profile sync",
  JOB_IMPORT: "Job import",
  GIG_MANAGEMENT: "Gig management",
  PROPOSAL_MANAGEMENT: "Proposals",
  KEYWORD_RESEARCH: "Keyword research",
  BROWSER_ASSISTANCE: "Browser assistance",
  OFFICIAL_API: "Official API",
  OAUTH: "OAuth",
  AUTOMATIC_SUBMISSION: "Automatic submission",
};

const STATUS_TONES = {
  SUPPORTED: "green",
  NOT_SUPPORTED: "neutral",
  USER_AUTH_REQUIRED: "amber",
  PLATFORM_APPROVAL_REQUIRED: "amber",
  MANUAL_ONLY: "blue",
};

const ACCOUNT_TONES = {
  CONNECTED: "green",
  NOT_CONNECTED: "neutral",
  AUTH_REQUIRED: "amber",
  ERROR: "red",
};

const CONNECT_ERRORS = {
  "consent-declined": "Freelancer authorization was declined — nothing was connected.",
  "state-mismatch": "The connection could not be verified (security check). Please try again.",
  "exchange-failed": "Freelancer did not accept the authorization. Please try again.",
  "missing-parameters": "The callback was missing required parameters.",
  "not-signed-in": "Your session expired — sign in and connect again.",
  "not-permitted": "This connection is not permitted by the platform capability model.",
};

export default async function PlatformsPage({ searchParams }) {
  const session = await auth();
  const params = await searchParams;

  const platforms = await prisma.platform.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      capabilities: { orderBy: { capability: "asc" } },
      platformAccounts: { where: { userId: session.user.id } },
    },
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Platforms</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Every capability below reflects what the marketplace officially supports —
          FreelanceOS never automates what a platform has not approved, and the final
          publish action always stays with you.
        </p>
      </header>

      {params?.connected === "freelancer" ? (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Freelancer account connected via the official API.
        </div>
      ) : null}
      {params?.connect_error && CONNECT_ERRORS[params.connect_error] ? (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          {CONNECT_ERRORS[params.connect_error]}
        </div>
      ) : null}

      {platforms.length === 0 ? (
        <Card>
          <EmptyState
            icon={ShieldAlert}
            title="No platforms configured"
            description="Run the platform seed to populate the catalog."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {platforms.map((platform) => {
            const account = platform.platformAccounts[0];
            return (
              <Card key={platform.id}>
                <CardHeader
                  title={platform.name}
                  subtitle={
                    account
                      ? `Account: ${account.externalUsername ?? "linked"}`
                      : "Not connected"
                  }
                  action={
                    <div className="flex items-center gap-2">
                      <Badge tone={ACCOUNT_TONES[account?.status ?? "NOT_CONNECTED"]}>
                        {(account?.status ?? "NOT_CONNECTED").replace(/_/g, " ").toLowerCase()}
                      </Badge>
                      {platform.websiteUrl ? (
                        <a
                          href={platform.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-slate-600"
                          title={`Open ${platform.name}`}
                        >
                          <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  }
                />
                <ul className="divide-y divide-slate-100">
                  {platform.capabilities.map((capability) => (
                    <li
                      key={capability.id}
                      className="flex items-start justify-between gap-3 px-5 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {CAPABILITY_LABELS[capability.capability] ?? capability.capability}
                        </p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">
                          {capability.notes}
                        </p>
                      </div>
                      <Badge tone={STATUS_TONES[capability.status] ?? "neutral"}>
                        {capability.status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </li>
                  ))}
                </ul>

                {platform.slug === "freelancer" ? (
                  <FreelancerCardActions
                    connected={account?.status === "CONNECTED"}
                    configured={freelancerConfigured()}
                    username={account?.externalUsername}
                  />
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          <div className="text-sm text-slate-700">
            <p className="font-medium text-slate-900">Human approval is built in</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              FreelanceOS prepares content; you review and publish it yourself.
              Automatic submission is disabled for every platform by policy, and
              official API integrations are only built where the platform documents
              and permits them.
            </p>
            <Link href="/ai-studio" className="mt-2 inline-block text-xs font-medium text-violet-600 hover:text-violet-700">
              Prepare content in AI Studio →
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
