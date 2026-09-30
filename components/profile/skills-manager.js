"use client";

import { useState } from "react";
import { Loader2, Lock, Pencil, Plus, Trash2, X } from "lucide-react";

import { Badge } from "@/components/ui";
import {
  useProfileCrud,
  fieldClass,
  labelClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/profile/use-profile-crud";

const EMPTY_FORM = { name: "", category: "", level: "" };

/**
 * Skills are a mix of portfolio-synced rows (read-only here — a sync
 * replaces them) and manual rows (full CRUD, preserved across syncs).
 */
export function SkillsManager({ skills }) {
  const { pending, error, setError, run } = useProfileCrud();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const grouped = groupByCategory(skills);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
    setError(null);
  };

  const openEdit = (skill) => {
    setEditingId(skill.id);
    setForm({
      name: skill.name,
      category: skill.category ?? "",
      level: skill.level ?? "",
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
    const payload = { name: form.name, category: form.category, level: form.level };
    const result = editingId
      ? await run("PATCH", `/api/profile/skills/${editingId}`, payload)
      : await run("POST", "/api/profile/skills", payload);
    if (result) closeForm();
  };

  const handleDelete = async (skill) => {
    if (!window.confirm(`Remove skill "${skill.name}"?`)) return;
    await run("DELETE", `/api/profile/skills/${skill.id}`);
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
            Add skill
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
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="skill-name" className={labelClass}>Name</label>
              <input id="skill-name" className={fieldClass} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label htmlFor="skill-category" className={labelClass}>Category</label>
              <input id="skill-category" className={fieldClass} value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Backend" />
            </div>
            <div>
              <label htmlFor="skill-level" className={labelClass}>Level (1–5)</label>
              <input id="skill-level" type="number" min="1" max="5" className={fieldClass}
                value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={pending} className={primaryButtonClass}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {editingId ? "Save changes" : "Add skill"}
          </button>
        </form>
      ) : error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {grouped.length === 0 ? (
        <p className="py-2 text-center text-sm text-slate-500">
          No skills yet — sync your portfolio or add one manually.
        </p>
      ) : (
        grouped.map((group) => (
          <div key={group.category ?? "other"}>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {group.category ?? "Other"}
            </p>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {group.skills.map((skill) => (
                <li key={skill.id} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm text-slate-800">{skill.name}</span>
                    {skill.level ? (
                      <span className="text-[11px] text-slate-400">L{skill.level}</span>
                    ) : null}
                    {skill.source === "PORTFOLIO" ? (
                      <Badge tone="neutral">
                        <Lock className="mr-1 h-3 w-3" aria-hidden="true" />
                        synced
                      </Badge>
                    ) : null}
                  </div>
                  {skill.source === "MANUAL" ? (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => openEdit(skill)} title="Edit"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => handleDelete(skill)} title="Delete"
                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <span className="shrink-0 text-[11px] text-slate-400" title="Managed by portfolio sync">
                      via sync
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function groupByCategory(skills) {
  const groups = new Map();
  for (const skill of skills) {
    const key = skill.category ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(skill);
  }
  return Array.from(groups, ([category, groupSkills]) => ({ category, skills: groupSkills }));
}
