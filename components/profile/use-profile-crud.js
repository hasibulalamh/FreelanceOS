"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Shared fetch/state handling for profile editing components.
 * Returns a `run(method, path, body)` that resolves with the API `data`
 * (or null on failure), tracks pending/error state, and refreshes server
 * components after a successful mutation.
 */
export function useProfileCrud() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (method, path, body) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch(path, {
          method,
          headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok) {
          const details = payload?.error?.details;
          const firstFieldError =
            details && typeof details === "object"
              ? Object.values(details).flat()[0]
              : null;
          const message = payload?.error?.message ?? "Request failed.";
          setError(firstFieldError ? `${message} — ${firstFieldError}` : message);
          return null;
        }

        router.refresh();
        return payload.data;
      } catch {
        setError("Network error. Please retry.");
        return null;
      } finally {
        setPending(false);
      }
    },
    [router]
  );

  return { pending, error, setError, run };
}

export const fieldClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 " +
  "placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 " +
  "focus:ring-violet-500/20";

export const labelClass = "mb-1 block text-xs font-medium text-slate-600";

export const primaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-sm font-medium " +
  "text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs " +
  "font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60";
