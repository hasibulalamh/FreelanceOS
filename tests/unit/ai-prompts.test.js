import { describe, expect, it } from "vitest";

import { PROMPTS, getPrompt } from "@/services/ai/prompts";
import {
  keywordResearchOutputSchema,
  keywordResearchInputSchema,
} from "@/validators/ai";
import { keywordProfileSchema } from "@/validators/ai";

const validProfile = {
  fullName: "Hasibul Alam",
  professionalTitle: "Full-stack developer",
  skills: ["Laravel", "Next.js"],
  services: [{ title: "Web app development" }],
  projects: [{ title: "CRM platform", technologies: ["Laravel", "Vue"] }],
  certifications: [],
};

const validOutput = {
  keywords: [
    {
      keyword: "laravel developer",
      intent: "commercial",
      rationale: "Matches the profile's backend focus.",
      suggestedUse: "profile title",
    },
  ],
  positioningSummary: "Backend-focused Laravel freelancer.",
  caveats: [],
};

describe("ai prompts registry", () => {
  it("exposes a current version for every declared module", () => {
    for (const [kind, entry] of Object.entries(PROMPTS)) {
      expect(entry.currentVersion).toBeGreaterThanOrEqual(1);
      expect(entry.versions[entry.currentVersion]).toBeDefined();
      expect(getPrompt(kind)).toBe(entry.versions[entry.currentVersion]);
    }
  });

  it("keyword research v1 builds input from the profile projection", () => {
    const prompt = getPrompt("KEYWORD_RESEARCH");
    const text = prompt.buildInput({
      profile: validProfile,
      extraContext: "Targeting SaaS founders",
    });

    expect(text).toContain("Hasibul Alam");
    expect(text).toContain("Laravel");
    expect(text).toContain("Targeting SaaS founders");
    // The honesty rules must be part of the system instruction.
    expect(prompt.systemInstruction).toContain("Never invent numeric metrics");
  });

  it("keyword research v1 output schema accepts a well-formed answer", () => {
    const parsed = PROMPTS.KEYWORD_RESEARCH.versions[1].outputSchema.safeParse(
      validOutput
    );
    expect(parsed.success).toBe(true);
  });

  it("keyword research v1 output schema rejects fabricated metric fields", () => {
    // Strictness matters: the JSON Schema sent to Gemini is derived from
    // these schemas, so unknown keys (e.g. an invented "searchVolume") are
    // stripped/rejected rather than silently rendered by the UI.
    const withVolume = {
      ...validOutput,
      keywords: [
        {
          ...validOutput.keywords[0],
          searchVolume: 12000,
          competition: 0.42,
        },
      ],
    };
    const parsed = keywordResearchOutputSchema.safeParse(withVolume);
    // The enriched validator strips unknown keys; the important guarantee is
    // that no metric field survives into the data the UI renders.
    expect(parsed.success && "searchVolume" in parsed.data.keywords[0]).toBe(
      false
    );
  });
});

describe("keyword research validators", () => {
  it("input schema allows only extraContext", () => {
    expect(
      keywordResearchInputSchema.safeParse({ extraContext: "B2B focus" }).success
    ).toBe(true);
    expect(keywordResearchInputSchema.safeParse({}).success).toBe(true);
    // Unknown keys rejected (strict) — no prompt injection surface via API.
    expect(
      keywordResearchInputSchema.safeParse({ profile: { skills: ["x"] } }).success
    ).toBe(false);
    expect(
      keywordResearchInputSchema.safeParse({ extraContext: "x".repeat(2001) })
        .success
    ).toBe(false);
  });

  it("output schema rejects duplicate keywords", () => {
    const duplicated = {
      ...validOutput,
      keywords: [validOutput.keywords[0], { ...validOutput.keywords[0] }],
    };
    expect(keywordResearchOutputSchema.safeParse(duplicated).success).toBe(false);
  });

  it("output schema rejects empty keyword lists", () => {
    expect(
      keywordResearchOutputSchema.safeParse({ ...validOutput, keywords: [] })
        .success
    ).toBe(false);
  });

  it("profile projection schema caps collection sizes", () => {
    const huge = {
      ...validProfile,
      skills: Array.from({ length: 61 }, (_, i) => `skill-${i}`),
    };
    expect(keywordProfileSchema.safeParse(huge).success).toBe(false);
  });
});
