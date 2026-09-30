import Link from "next/link";
import { notFound } from "next/navigation";
import { Construction, ArrowLeft } from "lucide-react";

import { Card, Badge } from "@/components/ui";

// Catch-all for dashboard routes whose modules are not implemented yet.
// Implemented routes (dashboard, profile, platforms, ...) take precedence;
// this renders an honest "planned module" state for the rest.
// Must stay dynamic: the (dashboard) layout performs a per-request session
// check, and a static render would bake the unauthenticated redirect in.
export const dynamic = "force-dynamic";

const MODULE_PHASES = {
  jobs: { phase: "Phase 11", title: "Jobs", note: "Imported jobs and the job analyzer." },
  "ai-studio": { phase: "Phase 8+", title: "AI Studio", note: "Gemini-powered generation workspace." },
  gigs: { phase: "Phase 15", title: "Gigs", note: "Gig builder and version history." },
  proposals: { phase: "Phase 13", title: "Proposals", note: "Proposal pipeline and pipeline board." },
  clients: { phase: "Phase 17", title: "Clients", note: "Client CRM and interaction history." },
  portfolio: { phase: "Phase 6", title: "Portfolio", note: "Synced portfolio projects." },
  research: { phase: "Phase 16", title: "Research", note: "Research workspace for permitted sources." },
  analytics: { phase: "Phase 18", title: "Analytics", note: "Real, verifiable metrics only." },
  notifications: { phase: "Phase 19", title: "Notifications", note: "Queue-driven notifications." },
  integrations: { phase: "Phase 19", title: "Integrations", note: "R2 storage and external integrations." },
  settings: { phase: "Ongoing", title: "Settings", note: "Account and application settings." },
};



export default async function ModulePlaceholderPage({ params }) {
  const { slug } = await params;
  const key = slug?.[0];

  // Only known planned modules render here. Anything else — including
  // unmatched /api/* paths, which must never return a page shell — is a 404.
  if (!key || key === "api" || !MODULE_PHASES[key]) {
    notFound();
  }

  const meta = MODULE_PHASES[key];

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="p-8 text-center">
        <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
          <Construction className="h-6 w-6 text-amber-600" aria-hidden="true" />
        </div>
        <div className="mb-2 flex items-center justify-center gap-2">
          <h1 className="text-xl font-semibold text-slate-900">
            {meta?.title ?? "Module"} — planned
          </h1>
          <Badge tone="amber">{meta?.phase ?? "Planned"}</Badge>
        </div>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          {meta?.note ??
            "This module is part of the FreelanceOS build plan and has not been implemented yet."}
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs text-slate-500">
          Built incrementally, one verified phase at a time — this section appears here
          as soon as its phase lands.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Back to dashboard
        </Link>
      </Card>
    </div>
  );
}
