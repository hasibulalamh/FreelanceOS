import { z } from "zod";

/**
 * Versioned AI prompt registry.
 *
 * Every AI module declares its prompt here with an integer version. The
 * version is persisted with each AiGeneration row, so outputs remain
 * interpretable (and reproducible in spirit) after prompts evolve. Never
 * edit a prompt in place — add the next version and point CURRENT at it.
 *
 * Output schemas are plain zod (no refinements) so they convert cleanly to
 * JSON Schema for the Gemini structured-output mode. Cross-field rules live
 * in validators/ai.js instead, where they also guard the API layer.
 */

// Shared honesty rules. FreelanceOS renders only claims the data supports;
// the model must not invent numbers (search volumes, competition scores,
// salary data) that no API provided to it.
const HONESTY_RULES = `
Honesty rules (non-negotiable):
- Never invent numeric metrics you were not given: no search volumes, no
  competition scores, no CPC/salary figures, no "difficulty out of 100".
- Use the provided profile/projects/services as the only factual source about
  the freelancer. Do not fabricate experience, clients, or portfolio items.
- If the input is too thin to analyze confidently, say so in "caveats"
  instead of padding the output with plausible-looking filler.
- Recommendations must be actionable and specific to the provided input.
`.trim();

const KEYWORD_IDEA_SHAPE = `
For every keyword idea include:
- "keyword": 1-4 word phrase a real client would type or say.
- "intent": one of "informational", "commercial", "transactional", "navigational".
- "rationale": 1-2 sentences connecting it to the provided profile/skills/services.
- "suggestedUse": where to deploy it ("profile title", "portfolio project",
  "service description", "proposal intro", "gig title" or similar).
`.trim();

const keywordIdea = z.object({
  keyword: z.string().min(1).max(80),
  intent: z.enum(["informational", "commercial", "transactional", "navigational"]),
  rationale: z.string().min(1).max(400),
  suggestedUse: z.string().min(1).max(120),
});

const keywordResearchOutput = z.object({
  keywords: z.array(keywordIdea).min(1).max(15),
  positioningSummary: z.string().max(600),
  caveats: z.array(z.string()).max(8),
});

function buildKeywordResearchPrompt({ profile, extraContext }) {
  const lines = [
    "Analyze this freelancer profile for search keywords a potential client",
    "would use when looking for someone like them.",
    "",
    "Freelancer profile (JSON):",
    JSON.stringify(profile, null, 2),
  ];
  if (extraContext) {
    lines.push("", "Additional context from the freelancer:", extraContext);
  }
  lines.push("", KEYWORD_IDEA_SHAPE);
  return lines.join("\n");
}

export const PROMPTS = {
  KEYWORD_RESEARCH: {
    currentVersion: 1,
    versions: {
      1: {
        version: 1,
        systemInstruction: [
          "You are a freelance-market SEO and positioning analyst.",
          "You analyze a freelancer's own profile data and suggest search",
          "keywords. You state uncertainty honestly instead of inventing",
          "metrics.",
          "",
          HONESTY_RULES,
        ].join(" "),
        outputSchema: keywordResearchOutput,
        buildInput: buildKeywordResearchPrompt,
      },
    },
  },
};

/** Resolves the current prompt definition for a module. */
export function getPrompt(kind) {
  const entry = PROMPTS[kind];
  if (!entry) throw new Error(`Unknown AI prompt kind: ${kind}`);
  return entry.versions[entry.currentVersion];
}
