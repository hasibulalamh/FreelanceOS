"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, X } from "lucide-react";

import { useProfileCrud } from "@/components/profile/use-profile-crud";

const FIELD_LABELS = {
  fullName: "Full name",
  professionalTitle: "Professional title",
  bio: "Bio",
  summary: "Summary",
  location: "Location",
  portfolioUrl: "Portfolio URL",
  avatarUrl: "Avatar",
};

/**
 * Shows which identity fields the user has manually overridden (portfolio
 * sync skips them) and lets the user release an override, which immediately
 * restores the portfolio value via a forced sync.
 */
export function OverrideList({ overrides }) {
  const { pending, error, run } = useProfileCrud();
  const [notice, setNotice] = useState(null);

  if (!overrides?.length) return null;

  const release = async (field) => {
    setNotice(null);
    const result = await run("DELETE", `/api/profile/overrides/${field}`);
    if (!result) return;

    if (result.sync?.status === "SYNCED") {
      setNotice(`${FIELD_LABELS[field] ?? field} restored from your portfolio.`);
    } else {
      setNotice(
        `${FIELD_LABELS[field] ?? field} released — it will update from your portfolio on the next successful sync.`
      );
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-medium text-amber-800">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Manual fields — portfolio sync skips these until released
      </p>
      <div className="flex flex-wrap gap-1.5">
        {overrides.map((field) => (
          <span
            key={field}
            className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs text-amber-900"
          >
            {FIELD_LABELS[field] ?? field}
            <button
              type="button"
              onClick={() => release(field)}
              disabled={pending}
              title="Let portfolio sync manage this again"
              className="rounded-full p-0.5 text-amber-600 hover:bg-amber-100 hover:text-amber-900 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <X className="h-3 w-3" aria-hidden="true" />
              )}
            </button>
          </span>
        ))}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="text-xs text-amber-800">
          {notice}
        </p>
      ) : null}
    </div>
  );
}
