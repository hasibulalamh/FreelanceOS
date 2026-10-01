import { ok, fail, readJson } from "@/lib/api";
import { auth } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { logActivity } from "@/lib/activity";
import { keywordResearchInputSchema } from "@/validators/ai";
import { runKeywordResearch } from "@/services/ai/generation-service";

/**
 * POST /api/ai/keyword-research
 *
 * Generates keyword ideas from the user's own profile via Gemini structured
 * output. Every attempt (success or failure) is persisted as an AiGeneration
 * row — the dashboard "AI generations" stat counts real rows, and the audit
 * trail shows what the model was asked and answered.
 */
export async function POST(request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return fail("Unauthorized", 401);

  const ip = clientIp(request);
  // 10 generations / 10 min — AI calls cost real money and take seconds;
  // this stays well above legitimate single-user usage.
  if (!rateLimit(`ai-keywords:${userId}:${ip}`, 10, 10 * 60 * 1000)) {
    return fail("Too many AI requests. Try again later.", 429);
  }

  const body = await readJson(request);
  if (body === null) return fail("Invalid JSON body");

  const parsed = keywordResearchInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid input", 400, parsed.error.flatten().fieldErrors);
  }

  const result = await runKeywordResearch(userId, parsed.data);
  if (!result.ok) {
    return fail(result.message, result.status, result.details);
  }

  const { generation } = result;
  await logActivity(userId, "ai.keyword_research", "ai", {
    generationId: generation.id,
    model: generation.model,
    promptVersion: generation.promptVersion,
    keywords: generation.output.keywords.length,
  });

  return ok(
    {
      id: generation.id,
      kind: generation.kind,
      model: generation.model,
      promptVersion: generation.promptVersion,
      output: generation.output,
      usage: {
        promptTokens: generation.promptTokens,
        completionTokens: generation.completionTokens,
        totalTokens: generation.totalTokens,
      },
      latencyMs: generation.latencyMs,
      createdAt: generation.createdAt,
    },
    { status: 201 }
  );
}
