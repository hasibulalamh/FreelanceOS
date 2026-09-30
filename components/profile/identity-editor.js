"use client";

import { useState } from "react";
import { Info, Loader2, Pencil } from "lucide-react";

import {
  useProfileCrud,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/profile/use-profile-crud";

/**
 * Edit form for identity fields. These fields are portfolio-sourced: the
 * form says so, because a portfolio sync overwrites manual identity edits.
 */
export function IdentityEditor({ profile }) {
  const { pending, error, setError, run } = useProfileCrud();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: profile.fullName ?? "",
    professionalTitle: profile.professionalTitle ?? "",
    summary: profile.summary ?? "",
    bio: profile.bio ?? "",
    location: profile.location ?? "",
    websiteUrl: profile.websiteUrl ?? "",
    hourlyRate: profile.hourlyRate ?? "",
    currency: profile.currency ?? "USD",
    languages: (profile.languages ?? []).join(", "),
  });

  const set = (key) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setError(null);

    const payload = {
      fullName: form.fullName,
      professionalTitle: form.professionalTitle,
      summary: form.summary,
      bio: form.bio,
      location: form.location,
      websiteUrl: form.websiteUrl,
      hourlyRate: form.hourlyRate === "" ? "" : Number(form.hourlyRate),
      currency: form.currency,
      languages: form.languages
        .split(",")
        .map((language) => language.trim())
        .filter(Boolean),
    };

    const result = await run("PATCH", "/api/profile", payload);
    if (result) setEditing(false);
  };

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className={secondaryButtonClass}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        Edit
      </button>
    );
  }

  return (
    <form onSubmit={handleSave} className="w-full space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
        <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
        Fields you save here are marked as manual — portfolio sync skips them
        until you release them (see the manual-fields list on the profile).
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div>
          <label htmlFor="fullName" className={labelClass}>Full name</label>
          <input id="fullName" className={fieldClass} value={form.fullName} onChange={set("fullName")} />
        </div>
        <div>
          <label htmlFor="professionalTitle" className={labelClass}>Professional title</label>
          <input id="professionalTitle" className={fieldClass} value={form.professionalTitle} onChange={set("professionalTitle")} />
        </div>
        <div>
          <label htmlFor="location" className={labelClass}>Location</label>
          <input id="location" className={fieldClass} value={form.location} onChange={set("location")} />
        </div>
        <div>
          <label htmlFor="websiteUrl" className={labelClass}>Website</label>
          <input id="websiteUrl" type="url" className={fieldClass} value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://…" />
        </div>
        <div>
          <label htmlFor="hourlyRate" className={labelClass}>Hourly rate</label>
          <input id="hourlyRate" type="number" min="0" className={fieldClass} value={form.hourlyRate} onChange={set("hourlyRate")} />
        </div>
        <div>
          <label htmlFor="currency" className={labelClass}>Currency</label>
          <input id="currency" className={fieldClass} value={form.currency} onChange={set("currency")} maxLength={3} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="summary" className={labelClass}>Summary (short, for profiles)</label>
          <input id="summary" className={fieldClass} value={form.summary} onChange={set("summary")} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="bio" className={labelClass}>Bio</label>
          <textarea id="bio" rows={4} className={fieldClass} value={form.bio} onChange={set("bio")} />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="languages" className={labelClass}>Languages (comma-separated)</label>
          <input id="languages" className={fieldClass} value={form.languages} onChange={set("languages")} placeholder="English, Bengali" />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          onClick={() => {
            setEditing(false);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
