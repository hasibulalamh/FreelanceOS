import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const trimmed = (max) => z.string().trim().max(max);

// Semantics of an empty form input:
//   key absent            → leave the stored value untouched
//   key present as ""     → CLEAR the field (write null) when the column is
//                           nullable; for non-nullable columns the field is
//                           simply not part of the update.
const emptyToNull = (schema) =>
  z.preprocess((value) => (value === "" ? null : value), schema.nullable().optional());

// For non-nullable columns with defaults (currency) or array columns
// (languages — pass [] to clear).
const emptyToUndefined = (schema) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

const optionalUrl = emptyToNull(z.string().url());

// HTML date inputs submit "YYYY-MM-DD" strings.
const optionalDate = emptyToNull(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").transform((v) => new Date(`${v}T00:00:00.000Z`))
);

const nonEmpty = (schema, message) => schema.refine((v) => v.length > 0, { message });

// ---------------------------------------------------------------------------
// Identity (PATCH /api/profile)
//
// Identity fields are portfolio-sourced: a portfolio sync overwrites them.
// The API accepts partial updates — only provided keys are written.
// ---------------------------------------------------------------------------

export const identityUpdateSchema = z
  .object({
    fullName: emptyToNull(trimmed(120)),
    professionalTitle: emptyToNull(trimmed(120)),
    summary: emptyToNull(trimmed(500)),
    bio: emptyToNull(trimmed(5000)),
    location: emptyToNull(trimmed(120)),
    websiteUrl: optionalUrl,
    avatarUrl: optionalUrl,
    hourlyRate: emptyToNull(z.coerce.number().int().min(0).max(100000)),
    currency: emptyToUndefined(z.string().trim().length(3).transform((v) => v.toUpperCase())),
    languages: z.array(trimmed(60)).max(20).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((v) => v !== undefined), {
    message: "No fields to update",
  });

// ---------------------------------------------------------------------------
// Skills (manual rows only — PORTFOLIO rows are sync-managed)
// ---------------------------------------------------------------------------

export const skillCreateSchema = z.object({
  name: nonEmpty(trimmed(60), "Name is required"),
  category: emptyToNull(trimmed(60)),
  level: emptyToNull(z.coerce.number().int().min(1).max(5)),
});

export const skillUpdateSchema = skillCreateSchema.partial();

// ---------------------------------------------------------------------------
// Services (always manual — the portfolio API has no services endpoint)
// ---------------------------------------------------------------------------

export const serviceCreateSchema = z.object({
  title: nonEmpty(trimmed(120), "Title is required"),
  category: emptyToNull(trimmed(80)),
  description: emptyToNull(trimmed(2000)),
});

export const serviceUpdateSchema = serviceCreateSchema.partial();

// ---------------------------------------------------------------------------
// Certifications (always manual — the portfolio API has no endpoint)
// ---------------------------------------------------------------------------

const certificationBase = z.object({
  name: nonEmpty(trimmed(120), "Name is required"),
  issuer: nonEmpty(trimmed(120), "Issuer is required"),
  issueDate: optionalDate,
  expiryDate: optionalDate,
  credentialUrl: optionalUrl,
});

function datesInOrder(data) {
  return !(data.issueDate && data.expiryDate && data.expiryDate < data.issueDate);
}

export const certificationCreateSchema = certificationBase.refine(datesInOrder, {
  message: "Expiry date must be after the issue date",
});

export const certificationUpdateSchema = certificationBase.partial().refine(datesInOrder, {
  message: "Expiry date must be after the issue date",
});
