"use client";

import { useState } from "react";
import { ExternalLink, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import {
  useProfileCrud,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/profile/use-profile-crud";

const EMPTY_FORM = { name: "", issuer: "", issueDate: "", expiryDate: "", credentialUrl: "" };

function toDateInput(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Certifications are manual-only (the portfolio API has no endpoint). */
export function CertificationsManager({ certifications }) {
  const { pending, error, setError, run } = useProfileCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError(null);
  };

  const openEdit = (certification) => {
    setEditingId(certification.id);
    setForm({
      name: certification.name,
      issuer: certification.issuer,
      issueDate: toDateInput(certification.issueDate),
      expiryDate: toDateInput(certification.expiryDate),
      credentialUrl: certification.credentialUrl ?? "",
    });
    setFormOpen(true);
    setError(null);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = { ...form };
    const result = editingId
      ? await run("PATCH", `/api/profile/certifications/${editingId}`, payload)
      : await run("POST", "/api/profile/certifications", payload);
    if (result) closeForm();
  };

  const handleDelete = async (certification) => {
    if (!window.confirm(`Remove certification "${certification.name}"?`)) return;
    await run("DELETE", `/api/profile/certifications/${certification.id}`);
  };

  return (
    <div className="space-y-4 px-5 py-4">
      <div className="flex justify-end">
        {formOpen ? (
          <button type="button" onClick={closeForm} className={secondaryButtonClass}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Close
          </button>
        ) : (
          <button type="button" onClick={openAdd} className={secondaryButtonClass}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add certification
          </button>
        )}
      </div>

      {formOpen ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
          {error ? (
            <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="cert-name" className={labelClass}>Name</label>
              <input id="cert-name" className={fieldClass} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="AWS Solutions Architect" required />
            </div>
            <div>
              <label htmlFor="cert-issuer" className={labelClass}>Issuer</label>
              <input id="cert-issuer" className={fieldClass} value={form.issuer}
                onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                placeholder="Amazon Web Services" required />
            </div>
            <div>
              <label htmlFor="cert-issue" className={labelClass}>Issue date</label>
              <input id="cert-issue" type="date" className={fieldClass} value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })} />
            </div>
            <div>
              <label htmlFor="cert-expiry" className={labelClass}>Expiry date</label>
              <input id="cert-expiry" type="date" className={fieldClass} value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="cert-url" className={labelClass}>Credential URL</label>
              <input id="cert-url" type="url" className={fieldClass} value={form.credentialUrl}
                onChange={(e) => setForm({ ...form, credentialUrl: e.target.value })}
                placeholder="https://…" />
            </div>
          </div>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {editingId ? "Save changes" : "Add certification"}
          </button>
        </form>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {certifications.length === 0 ? (
        <p className="py-2 text-center text-sm text-slate-500">
          No certifications yet — add them manually; the portfolio API does not provide any.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {certifications.map((certification) => (
            <li key={certification.id} className="flex items-start justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{certification.name}</p>
                <p className="text-xs text-slate-600">{certification.issuer}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {certification.issueDate ? `Issued ${toDateInput(certification.issueDate)}` : null}
                  {certification.expiryDate ? ` · Expires ${toDateInput(certification.expiryDate)}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                {certification.credentialUrl ? (
                  <a href={certification.credentialUrl} target="_blank" rel="noopener noreferrer" title="Credential"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-violet-600">
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ) : null}
                <button type="button" onClick={() => openEdit(certification)} title="Edit"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => handleDelete(certification)} title="Delete"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
