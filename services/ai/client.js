import { z } from "zod";

import { aiConfig } from "@/services/ai/config";

export class GeminiError extends Error {
  constructor(message, { status = null, reason = null, finishReason = null } = {}) {
    super(message);
    this.name = "GeminiError";
    this.status = status;
    this.reason = reason;
    this.finishReason = finishReason;
  }
}

/**
 * Extracts the text of the first text part of the first candidate, or null.
 */
function extractText(payload) {
  const candidate = payload?.candidates?.[0];
  const parts = candidate?.content?.parts ?? [];
  const text = parts
    .filter((part) => typeof part.text === "string")
    .map((part) => part.text)
    .join("");
  return text === "" ? null : text;
}

function extractUsage(payload) {
  const usage = payload?.usageMetadata ?? {};
  const toInt = (v) => (Number.isFinite(v) ? v : null);
  return {
    promptTokens: toInt(usage.promptTokenCount),
    completionTokens: toInt(usage.candidatesTokenCount),
    totalTokens: toInt(usage.totalTokenCount),
  };
}

function extractFinishReason(payload) {
  return payload?.candidates?.[0]?.finishReason ?? null;
}

/**
 * Calls Gemini `generateContent` and returns a value validated against the
 * given zod schema. The schema is converted to JSON Schema with zod v4's
 * `z.toJSONSchema` and sent as `responseJsonSchema` — the documented,
 * non-deprecated structured-output mechanism.
 *
 * @param {object} params
 * @param {string} params.prompt full user prompt (system instructions baked in)
 * @param {import("zod").ZodType} params.schema zod schema the output must satisfy
 * @param {string} [params.systemInstruction] optional system prompt
 * @param {string} [params.model] override aiConfig.model
 * @returns {Promise<{ data: unknown, usage: object, model: string, latencyMs: number }>}
 */
export async function generateStructured({
  prompt,
  schema,
  systemInstruction,
  model,
}) {
  if (!aiConfig.apiKey) {
    throw new GeminiError(
      "Gemini is not configured — set GEMINI_API_KEY.",
      { reason: "not_configured" }
    );
  }

  const jsonSchema = z.toJSONSchema(schema, { target: "draft-7" });
  const usedModel = model ?? aiConfig.model;

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: aiConfig.temperature,
      maxOutputTokens: aiConfig.maxOutputTokens,
      responseMimeType: "application/json",
      responseJsonSchema: jsonSchema,
    },
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
  };

  const url = `${aiConfig.baseUrl}/${aiConfig.apiVersion}/models/${usedModel}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), aiConfig.requestTimeoutMs);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": aiConfig.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    throw new GeminiError(
      error.name === "AbortError"
        ? "Gemini request timed out."
        : `Gemini API unreachable: ${error.message}`,
      { reason: error.name === "AbortError" ? "timeout" : "network" }
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new GeminiError("Gemini API returned invalid JSON.", {
      status: response.status,
      reason: "invalid_response",
    });
  }

  if (!response.ok) {
    const message =
      payload?.error?.message ?? `Gemini API error (HTTP ${response.status}).`;
    throw new GeminiError(message, { status: response.status, reason: "api_error" });
  }

  const finishReason = extractFinishReason(payload);
  const text = extractText(payload);
  if (!text) {
    throw new GeminiError(
      finishReason
        ? `Gemini returned no content (finishReason: ${finishReason}).`
        : "Gemini returned no content.",
      { status: response.status, reason: "empty_response", finishReason }
    );
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new GeminiError(
      "Gemini returned malformed JSON despite the JSON response mode.",
      { status: response.status, reason: "malformed_json" }
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new GeminiError(
      "Gemini output did not match the expected schema.",
      {
        status: response.status,
        reason: "schema_mismatch",
        finishReason,
      }
    );
  }

  return {
    data: result.data,
    usage: extractUsage(payload),
    model: usedModel,
    latencyMs: null, // filled in by the caller around the whole call
  };
}
