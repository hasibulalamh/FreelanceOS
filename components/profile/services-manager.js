"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui";
import {
  useProfileCrud,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/profile/use-profile-crud";

const EMPTY_FORM = { title: "", category: "", description: "" };

/**
 * Services are manual-only (the portfolio API has none). AI gig generation
 * later builds on this list, so titles should be market-facing.
 */
export function ServicesManager({ services }) {
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

  const openEdit = (service) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      category: service.category ?? "",
      description: service.description ?? "",
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
    const payload = {
      title: form.title,
      category: form.category,
      description: form.description,
    };
    const result = editingId
      ? await run("PATCH", `/api/profile/services/${editingId}`, payload)
      : await run("POST", "/api/profile/services", payload);
    if (result) closeForm();
  };

  const handleDelete = async (service) => {
    if (!window.confirm(`Remove service "${service.title}"?`)) return;
    await run("DELETE", `/api/profile/services/${service.id}`);
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
            Add service
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
          <div>
            <label htmlFor="service-title" className={labelClass}>Title</label>
            <input id="service-title" className={fieldClass} value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Laravel CRM development" required />
          </div>
          <div>
            <label htmlFor="service-category" className={labelClass}>Category</label>
            <input id="service-category" className={fieldClass} value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Web development" />
          </div>
          <div>
            <label htmlFor="service-description" className={labelClass}>Description</label>
            <textarea id="service-description" rows={3} className={fieldClass} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {editingId ? "Save changes" : "Add service"}
          </button>
        </form>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {services.length === 0 ? (
        <p className="py-2 text-center text-sm text-slate-500">
          No services yet — add the offerings you sell on marketplaces.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {services.map((service) => (
            <li key={service.id} className="flex items-start justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-slate-900">{service.title}</p>
                  {service.category ? <Badge tone="violet">{service.category}</Badge> : null}
                </div>
                {service.description ? (
                  <p className="mt-0.5 text-xs leading-5 text-slate-600">{service.description}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <button type="button" onClick={() => openEdit(service)} title="Edit"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => handleDelete(service)} title="Delete"
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
