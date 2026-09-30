"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Triggers portfolio synchronization and surfaces every async state:
 * loading, success (with counts), unchanged, failure (with retry), and
 * not-configured. All outcomes come from the API envelope — the button
 * never invents a result.
 */
export function PortfolioSyncButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleSync = async () => {
    setPending(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/portfolio/sync", { method: "POST" });
      const payload = await response.json();

      if (!response.ok || !payload.ok) {
        setError(payload?.error?.message ?? "Sync request failed.");
        return;
      }

      const data = payload.data;
      setResult(data);
      if (data.status === "SYNCED" || data.status === "UNCHANGED") {
        // Refresh server components so sync status/counters update.
        router.refresh();
      }
    } catch {
      setError("Network error. Please retry.");
    } finally {
      setPending(false);
    }
  };

  const successTone =
    result?.status === "SYNCED"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        )}
        {pending ? "Syncing…" : "Sync from Portfolio"}
      </button>

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <p>{error}</p>
            <button
              type="button"
              onClick={handleSync}
              className="mt-1 text-xs font-medium underline underline-offset-2"
            >
              Retry
            </button>
          </div>
        </div>
      ) : null}

      {result && !error ? (
        <div
          role="status"
          className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${successTone}`}
        >
          {result.status === "FAILED" ? (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <div>
            <p>{result.message}</p>
            {result.counts ? (
              <p className="mt-0.5 text-xs opacity-80">
                {result.counts.skills} skills · {result.counts.projects} projects ·{" "}
                {result.counts.experiences} experience · {result.counts.education} education ·{" "}
                {result.counts.testimonials} testimonials
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
