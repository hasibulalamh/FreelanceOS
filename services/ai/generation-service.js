import { prisma } from "@/lib/prisma";
import { aiConfig, isAiConfigured } from "@/services/ai/config";
import { generateStructured, GeminiError } from "@/services/ai/client";
import { getPrompt } from "@/services/ai/prompts";
import {
  keywordProfileSchema,
  keywordResearchOutputSchema,
} from "@/validators/ai";

/**
 * AI generation service — the only layer that combines prompts, the Gemini
 * client, validation, and persistence. Route handlers stay thin; AI logic
 * never touches HTTP concerns.
 *
 * Invariant: "AI proposes, the app validates and writes." Generated content
 * is stored as an audited draft (AiGeneration rows) and never auto-applied
 * to profile or platform data.
 */

/** Rough character → token estimate used only for the size guard below. */
const MAX_PROFILE_CHARS = 60_000;

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

/**
 * Projects the user's profile into the plain shape the keyword-research
 * prompt consumes. Returns { ok: false, reason } when there is nothing to
 * analyze — the app never sends an empty profile to the model just to get a
 * plausible-looking but fabricated analysis back.
 */
export async function buildKeywordProfileProjection(userId) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      skills: { select: { name: true } },
      services: { select: { title: true, description: true, category: true } },
      projects: {
        select: { title: true, description: true, technologies: true },
      },
      certifications: { select: { name: true, issuer: true } },
    },
  });

  if (!profile) return { ok: false, reason: "no_profile" };

  const projection = {
    ...(profile.fullName ? { fullName: profile.fullName } : {}),
    ...(profile.professionalTitle
      ? { professionalTitle: profile.professionalTitle }
      : {}),
    ...(profile.summary ? { summary: profile.summary } : {}),
    ...(profile.location ? { location: profile.location } : {}),
    ...(profile.websiteUrl ? { websiteUrl: profile.websiteUrl } : {}),
    ...(profile.languages.length > 0 ? { languages: profile.languages } : {}),
    skills: profile.skills.map((s) => s.name),
    services: profile.services.map((s) => ({
      title: s.title,
      ...(s.description ? { description: s.description } : {}),
      ...(s.category ? { category: s.category } : {}),
    })),
    projects: profile.projects.map((p) => ({
      title: p.title,
      ...(p.description ? { description: p.description } : {}),
      ...(p.technologies.length > 0 ? { technologies: p.technologies } : {}),
    })),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      ...(c.issuer ? { issuer: c.issuer } : {}),
    })),
  };

  const parsed = keywordProfileSchema.safeParse(projection);
  if (!parsed.success) {
    return { ok: false, reason: "projection_invalid" };
  }

  // The prompt embeds this projection; keep it bounded so a huge portfolio
  // cannot produce a runaway request.
  if (JSON.stringify(parsed.data).length > MAX_PROFILE_CHARS) {
    return { ok: false, reason: "profile_too_large" };
  }

  return { ok: true, profile: parsed.data };
}

/**
 * Runs the keyword-research generation end to end:
 * projection → prompt v1 → Gemini structured output → output validation →
 * AiGeneration row (COMPLETED, or FAILED with the error message).
 *
 * @returns {Promise<{ ok: true, generation: object } | { ok: false, status: number, message: string, details?: object }>}
 */
export async function runKeywordResearch(userId, { extraContext } = {}) {
  if (!isAiConfigured()) {
    return {
      ok: false,
      status: 503,
      message:
        "AI is not configured — set GEMINI_API_KEY to enable AI Studio modules.",
    };
  }

  const projection = await buildKeywordProfileProjection(userId);
  if (!projection.ok) {
    const messages = {
      no_profile:
        "No profile exists yet — create your profile before running keyword research.",
      projection_invalid:
        "Your profile contains data that cannot be used for analysis.",
      profile_too_large:
        "Your profile is too large to analyze in one request.",
    };
    return { ok: false, status: 400, message: messages[projection.reason] };
  }

  const promptDef = getPrompt("KEYWORD_RESEARCH");
  const input = { profile: projection.profile, ...(extraContext ? { extraContext } : {}) };
  const promptText = promptDef.buildInput({
    profile: projection.profile,
    extraContext,
  });

  const startedAt = Date.now();
  try {
    const { data, usage, model } = await generateStructured({
      prompt: promptText,
      schema: promptDef.outputSchema,
      systemInstruction: promptDef.systemInstruction,
    });

    // Second validation pass: cross-field rules (unique keywords, trimmed
    // lengths) that the raw JSON-Schema-shaped output does not enforce.
    const output = keywordResearchOutputSchema.parse(data);

    const latencyMs = Date.now() - startedAt;
    const generation = await prisma.aiGeneration.create({
      data: {
        userId,
        kind: "KEYWORD_RESEARCH",
        status: "COMPLETED",
        model,
        promptVersion: promptDef.version,
        input,
        output,
        promptTokens: numberOrNull(usage.promptTokens),
        completionTokens: numberOrNull(usage.completionTokens),
        totalTokens: numberOrNull(usage.totalTokens),
        latencyMs,
      },
    });

    return { ok: true, generation };
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const isSchemaError = error.name === "ZodError";
    const message = isSchemaError
      ? "Gemini output did not match the expected schema."
      : error instanceof GeminiError
        ? error.message
        : "AI generation failed unexpectedly.";

    // Failed attempts are recorded too: the audit trail must show that a
    // generation was attempted and why it produced nothing.
    await prisma.aiGeneration.create({
      data: {
        userId,
        kind: "KEYWORD_RESEARCH",
        status: "FAILED",
        model: aiConfig.model,
        promptVersion: promptDef.version,
        input,
        output: {},
        error: message,
        latencyMs,
      },
    });

    if (error instanceof GeminiError && error.reason === "not_configured") {
      return { ok: false, status: 503, message };
    }
    if (error instanceof GeminiError && error.reason === "timeout") {
      return { ok: false, status: 504, message };
    }
    if (error instanceof GeminiError && error.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "Gemini rate limit reached — try again in a moment.",
      };
    }
    return { ok: false, status: 502, message };
  }
}
