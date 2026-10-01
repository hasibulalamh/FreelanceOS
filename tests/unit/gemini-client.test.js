import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { generateStructured } from "@/services/ai/client";

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

const outputSchema = z.object({
  keywords: z.array(
    z.object({
      keyword: z.string(),
      intent: z.enum(["informational", "commercial", "transactional", "navigational"]),
      rationale: z.string(),
      suggestedUse: z.string(),
    })
  ),
  positioningSummary: z.string(),
  caveats: z.array(z.string()),
});

function geminiPayload(text) {
  return {
    candidates: [
      {
        content: { parts: [{ text }] },
        finishReason: "STOP",
      },
    ],
    usageMetadata: {
      promptTokenCount: 120,
      candidatesTokenCount: 80,
      totalTokenCount: 200,
    },
  };
}

function mockFetchOnce(payload, { status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(payload),
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("gemini client", () => {
  it("throws a typed not_configured error without an API key", async () => {
    process.env.GEMINI_API_KEY = "";
    await expect(
      generateStructured({ prompt: "p", schema: outputSchema })
    ).rejects.toMatchObject({ name: "GeminiError", reason: "not_configured" });
  });

  it("sends the documented request shape and returns validated data", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    const fetchMock = mockFetchOnce(geminiPayload(JSON.stringify(validOutput)));

    const result = await generateStructured({
      prompt: "analyze this",
      schema: outputSchema,
      systemInstruction: "be honest",
      model: "gemini-test-model",
    });

    expect(result.data).toEqual(validOutput);
    expect(result.model).toBe("gemini-test-model");
    expect(result.usage).toEqual({
      promptTokens: 120,
      completionTokens: 80,
      totalTokens: 200,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent"
    );
    expect(init.headers["x-goog-api-key"]).toBe("test-key");
    const body = JSON.parse(init.body);
    expect(body.contents[0].parts[0].text).toBe("analyze this");
    expect(body.systemInstruction.parts[0].text).toBe("be honest");
    expect(body.generationConfig.responseMimeType).toBe("application/json");
    // The zod schema must arrive as responseJsonSchema (draft-7 JSON Schema),
    // not the deprecated responseSchema dialect.
    expect(body.generationConfig.responseJsonSchema).toBeTruthy();
    expect(body.generationConfig.responseSchema).toBeUndefined();
    expect(
      body.generationConfig.responseJsonSchema.properties.keywords.type
    ).toBe("array");
  });

  it("rejects output that fails schema validation", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetchOnce(
      geminiPayload(JSON.stringify({ ...validOutput, keywords: "not-an-array" }))
    );

    await expect(
      generateStructured({ prompt: "p", schema: outputSchema })
    ).rejects.toMatchObject({ name: "GeminiError", reason: "schema_mismatch" });
  });

  it("maps HTTP errors to GeminiError with the API's message", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetchOnce(
      { error: { message: "API key not valid." } },
      { status: 400 }
    );

    await expect(
      generateStructured({ prompt: "p", schema: outputSchema })
    ).rejects.toMatchObject({
      name: "GeminiError",
      status: 400,
      message: "API key not valid.",
    });
  });

  it("reports empty responses with their finish reason", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetchOnce({ candidates: [{ finishReason: "SAFETY", content: {} }] });

    await expect(
      generateStructured({ prompt: "p", schema: outputSchema })
    ).rejects.toMatchObject({
      name: "GeminiError",
      reason: "empty_response",
      finishReason: "SAFETY",
    });
  });

  it("detects malformed JSON inside the JSON response mode", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    mockFetchOnce(geminiPayload("this is not json {"));

    await expect(
      generateStructured({ prompt: "p", schema: outputSchema })
    ).rejects.toMatchObject({ name: "GeminiError", reason: "malformed_json" });
  });
});
