import Link from "next/link";
import {
  Activity,
  ShieldCheck,
  Blocks,
  Sparkles,
  FileText,
  RefreshCw,
  ArrowRight,
  Lightbulb,
  Plus,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardHeader, StatCard, Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

// Profile health is a deterministic completeness score over profile fields —
// computed from the database, never invented. Weighted so identity and
// positioning fields matter more than optional contact details.
function computeProfileHealth(profile) {
  if (!profile) return 0;
  const checks = [
    { weight: 20, ok: Boolean(profile.fullName) },
    { weight: 20, ok: Boolean(profile.professionalTitle) },
    { weight: 15, ok: Boolean(profile.summary || profile.bio) },
    { weight: 10, ok: profile.skills.length > 0 },
    { weight: 10, ok: profile.services.length > 0 },
    { weight: 10, ok: profile.projects.length > 0 },
    { weight: 5, ok: profile.experiences.length > 0 },
    { weight: 5, ok: profile.education.length > 0 },
    { weight: 5, ok: profile.certifications.length > 0 },
  ];
  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const earned = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  return Math.round((earned / total) * 100);
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          skills: true,
          services: true,
          projects: true,
          experiences: true,
          education: true,
          certifications: true,
        },
      },
      platformAccounts: { include: { platform: true } },
      activityLogs: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });

  const profile = user.profile;
  const health = computeProfileHealth(profile);

  // Recommendations are derived from actual data gaps, not a static list.
  const recommendations = [];
  if (!profile || profile.syncStatus === "NEVER_SYNCED") {
    recommendations.push({
      text: "Synchronize your portfolio to populate your profile",
      href: "/profile",
    });
  }
  if (!profile?.professionalTitle) {
    recommendations.push({
      text: "Add a professional title — it anchors all AI generation",
      href: "/profile",
    });
  }
  if ((profile?.skills.length ?? 0) < 5) {
    recommendations.push({
      text: "Add at least 5 skills for better keyword matching",
      href: "/profile",
    });
  }
  if ((profile?.projects.length ?? 0) < 3) {
    recommendations.push({
      text: "Add more portfolio projects — proposals cite them as proof",
      href: "/portfolio",
    });
  }
  if (user.platformAccounts.length === 0) {
    recommendations.push({
      text: "Review supported platforms and connect the ones you use",
      href: "/platforms",
    });
  }
  const topRecommendations = recommendations.slice(0, 4);

  const connectedPlatforms = user.platformAccounts.filter(
    (pa) => pa.status === "CONNECTED"
  ).length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">
          {greeting()}, {user.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-slate-600">Your freelance command center</p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={ShieldCheck}
          label="Profile health"
          value={`${health}%`}
          hint={
            profile
              ? `${profile.skills.length} skills · ${profile.projects.length} projects`
              : "No profile yet"
          }
        />
        <StatCard
          icon={RefreshCw}
          label="Portfolio sync"
          value={
            profile?.syncStatus === "SYNCED"
              ? "Connected"
              : profile?.syncStatus === "FAILED"
                ? "Failed"
                : profile?.syncStatus === "SYNCING"
                  ? "Syncing"
                  : "Not synced"
          }
          hint={
            profile?.lastSyncedAt
              ? `Last: ${new Date(profile.lastSyncedAt).toLocaleString()}`
              : "Never synchronized"
          }
        />
        <StatCard
          icon={Blocks}
          label="Connected platforms"
          value={connectedPlatforms}
          hint={
            user.platformAccounts.length === 0
              ? "None connected yet"
              : `${user.platformAccounts.length} accounts tracked`
          }
        />
        <StatCard
          icon={Sparkles}
          label="AI generations"
          value="0"
          hint="AI Studio arrives in a later phase"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent activity"
            subtitle="Audit trail of your FreelanceOS actions"
          />
          {user.activityLogs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              description="Actions like portfolio sync and platform changes will appear here."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {user.activityLogs.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">
                      {entry.action.replace(/[._]/g, " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {entry.context ?? "system"} ·{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="AI recommendations" subtitle="Based on your current data gaps" />
          {topRecommendations.length === 0 ? (
            <EmptyState
              icon={Lightbulb}
              title="Looking good"
              description="No outstanding profile recommendations right now."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {topRecommendations.map((rec) => (
                <li key={rec.text}>
                  <Link
                    href={rec.href}
                    className="flex items-center justify-between gap-2 px-5 py-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <span>{rec.text}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Proposals"
            subtitle="Proposal pipeline arrives in Phase 3"
            action={
              <Badge tone="neutral">Coming soon</Badge>
            }
          />
          <EmptyState
            icon={FileText}
            title="No proposals yet"
            description="The proposal generator is scheduled for Phase 3 of the build."
            action={
              <Link
                href="/ai-studio"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Preview AI Studio
              </Link>
            }
          />
        </Card>

        <Card>
          <CardHeader
            title="Platform status"
            action={
              <Link href="/platforms" className="text-xs font-medium text-violet-600 hover:text-violet-700">
                Manage
              </Link>
            }
          />
          {user.platformAccounts.length === 0 ? (
            <EmptyState
              icon={Blocks}
              title="No platforms connected yet"
              description="Platform management becomes available as adapters are implemented."
              action={
                <Link
                  href="/platforms"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  Connect a platform
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {user.platformAccounts.map((pa) => (
                <li key={pa.id} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-800">{pa.platform.name}</span>
                  <Badge tone={pa.status === "CONNECTED" ? "green" : "neutral"}>
                    {pa.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}
