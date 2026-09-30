"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Link2,
  Loader2,
  Search,
  Unlink,
  UserRound,
  ExternalLink,
} from "lucide-react";

import { useProfileCrud } from "@/components/profile/use-profile-crud";
import { secondaryButtonClass } from "@/components/profile/use-profile-crud";

function formatBudget(job) {
  if (job.budgetMinimum == null && job.budgetMaximum == null) return null;
  const currency = job.currency ? `${job.currency} ` : "";
  if (job.budgetMinimum != null && job.budgetMaximum != null) {
    return `${currency}${job.budgetMinimum}–${job.budgetMaximum}`;
  }
  return `${currency}${job.budgetMinimum ?? job.budgetMaximum}`;
}

/**
 * Client actions for the Freelancer.com card: official OAuth connect,
 * disconnect, live profile fetch and a read-only job search preview against
 * the official projects API. No automation — every action is user-triggered.
 */
export function FreelancerCardActions({ connected, configured, username }) {
  const router = useRouter();
  const { pending, error, setError, run } = useProfileCrud();
  const [profile, setProfile] = useState(null);
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your Freelancer account? Stored tokens are destroyed. Also revoke FreelanceOS in your Freelancer account settings.")) {
      return;
    }
    const result = await run("DELETE", "/api/platforms/freelancer/connection");
    if (result) {
      setProfile(null);
      setJobs(null);
      router.refresh();
    }
  };

  const handleProfile = async () => {
    setError(null);
    setProfile(null);
    const data = await run("GET", "/api/platforms/freelancer/profile");
    if (data) setProfile(data.profile);
  };

  const handleSearch = async (event) => {
    event.preventDefault();
    if (query.trim().length < 2) return;
    setSearchError(null);
    setJobs(null);
    setSearching(true);
    try {
      const response = await fetch(
        `/api/platforms/freelancer/jobs?query=${encodeURIComponent(query.trim())}&limit=10`
      );
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setSearchError(payload?.error?.message ?? "Search failed.");
        return;
      }
      setJobs(payload.data);
    } catch {
      setSearchError("Network error. Please retry.");
    } finally {
      setSearching(false);
    }
  };

  if (!configured) {
    return (
      <p className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
        Official API integration present but not configured — set
        {" "}<code className="rounded bg-slate-100 px-1">FREELANCER_CLIENT_ID</code> and{" "}
        <code className="rounded bg-slate-100 px-1">FREELANCER_CLIENT_SECRET</code> to enable connecting.
      </p>
    );
  }

  return (
    <div className="space-y-3 border-t border-slate-100 px-5 py-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}

      {!connected ? (
        // Full navigation (not <Link> / router.push): /connect 302-redirects
        // to the Freelancer consent screen, which must be a top-level browser
        // load for the OAuth flow to complete correctly.
        <button
          type="button"
          onClick={() => {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = "/api/platforms/freelancer/connect";
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          <Link2 className="h-4 w-4" aria-hidden="true" />
          Connect with Freelancer
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">
              Connected as <span className="font-medium text-slate-800">{username ?? "unknown"}</span>
            </span>
            <button type="button" onClick={handleProfile} disabled={pending} className={secondaryButtonClass}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <UserRound className="h-3.5 w-3.5" aria-hidden="true" />}
              Fetch profile
            </button>
            <button type="button" onClick={handleDisconnect} disabled={pending} className={secondaryButtonClass}>
              <Unlink className="h-3.5 w-3.5" aria-hidden="true" />
              Disconnect
            </button>
          </div>

          {profile ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-medium text-slate-900">{profile.displayName ?? profile.username}</p>
              <p>
                {profile.country ?? "—"} ·{" "}
                {profile.hourlyRate ? `${profile.currency ?? ""}${profile.hourlyRate}/h` : "no hourly rate"}
              </p>
            </div>
          ) : null}

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search official projects, e.g. laravel"
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              minLength={2}
              maxLength={200}
            />
            <button
              type="submit"
              disabled={searching || query.trim().length < 2}
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              Search
            </button>
          </form>

          {searchError ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {searchError}
            </p>
          ) : null}

          {jobs ? (
            jobs.jobs.length === 0 ? (
              <p className="text-xs text-slate-500">No projects matched that search.</p>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">
                  {jobs.total} results · live from the official API · not stored yet (Phase 11)
                </p>
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {jobs.jobs.map((job) => (
                    <li key={job.id ?? job.title} className="flex items-start justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-800">{job.title}</p>
                        <p className="text-[11px] text-slate-500">
                          {formatBudget(job) ?? "budget n/a"}
                          {job.submittedAt ? ` · ${new Date(job.submittedAt).toLocaleDateString()}` : ""}
                        </p>
                      </div>
                      {job.seoUrl ? (
                        <a href={job.seoUrl} target="_blank" rel="noopener noreferrer" title="Open on Freelancer"
                          className="shrink-0 rounded-md p-1 text-slate-400 hover:text-violet-600">
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
