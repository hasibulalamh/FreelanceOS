import { z } from "zod";

/**
 * AI module validators.
 *
 * Input schemas guard the API surface; output schemas here carry the
 * cross-field rules that must NOT live in the prompt-registry schemas
 * (those must stay refinement-free for JSON Schema conversion — see
 * services/ai/prompts.js). The generation service validates the model
 * output twice: once in the client (raw shape) and once here (full rules).
 */

// ---------------------------------------------------------------------------
// Keyword research — input (POST /api/ai/keyword-research)
// ---------------------------------------------------------------------------

// Profile fields are supplied by the server from the DB; the user only adds
// optional free-form context (max 2000 chars) to steer the analysis.
export const keywordResearchInputSchema = z
  .object({
    extraContext: z.string().trim().max(2000).optional(),
  })
  .strict();

// Server-side projection of the Profile (identity + collections) sent to the
// model. Only fields useful for keyword analysis are included — never auth
// data, emails, or rates.
export const keywordProfileSchema = z.object({
  fullName: z.string().max(120).optional(),
  professionalTitle: z.string().max(120).optional(),
  summary: z.string().max(500).optional(),
  location: z.string().max(120).optional(),
  websiteUrl: z.string().max(300).optional(),
  languages: z.array(z.string().max(60)).max(20).optional(),
  skills: z.array(z.string().max(60)).max(60),
  services: z
    .array(
      z.object({
        title: z.string().max(120),
        description: z.string().max(2000).optional(),
        category: z.string().max(80).optional(),
      })
    )
    .max(40),
  projects: z
    .array(
      z.object({
        title: z.string().max(180),
        description: z.string().max(2000).optional(),
        technologies: z.array(z.string().max(60)).max(40).optional(),
      })
    )
    .max(40),
  certifications: z
    .array(
      z.object({
        name: z.string().max(120),
        issuer: z.string().max(120).optional(),
      })
    )
    .max(30),
});

// ---------------------------------------------------------------------------
// Keyword research — output (validated against the model's answer)
// ---------------------------------------------------------------------------

export const keywordIdeaSchema = z.object({
  keyword: z.string().trim().min(1).max(80),
  intent: z.enum(["informational", "commercial", "transactional", "navigational"]),
  rationale: z.string().trim().min(1).max(400),
  suggestedUse: z.string().trim().min(1).max(120),
});

export const keywordResearchOutputSchema = z
  .object({
    keywords: z.array(keywordIdeaSchema).min(1).max(15),
    positioningSummary: z.string().trim().min(1).max(600),
    caveats: z.array(z.string().trim().min(1).max(400)).max(8),
  })
  // The same keyword must not appear twice (case-insensitive) — a common
  // LLM duplication artifact the raw schema cannot express.
  .refine(
    (data) => {
      const seen = new Set();
      for (const idea of data.keywords) {
        const key = idea.keyword.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    },
    { message: "Keywords must be unique" }
  );
