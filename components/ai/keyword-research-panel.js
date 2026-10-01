"use client";

import { useState } from "react";
import { Loader2, Sparkles, Search } from "lucide-react";

import { Badge, Card, CardHeader } from "@/components/ui";

/**
 * Keyword research panel for AI Studio. Client island: runs the generation,
 * renders only validated fields returned by the API — the UI has nowhere to
 * display invented metrics, matching the honesty rule end to end.
 */
export function KeywordResearchPanel() {
  const [extraContext, setExtraContext] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [meta, setMeta] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/keyword-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          extraContext.trim() ? { extraContext: extraContext.trim() } : {}
        ),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setError(
          payload?.error?.message ??
            "Keyword research failed. Please try again."
        );
        setResult(null);
        setMeta(null);
        return;
      }

      setResult(payload.data.output);
      setMeta({
        model: payload.data.model,
        promptVersion: payload.data.promptVersion,
        latencyMs: payload.data.latencyMs,
        totalTokens: payload.data.usage?.totalTokens ?? null,
      });
    } catch {
      setError("Network error — could not reach the AI service.");
    } finally {
      setPending(false);
    }
  }

  const INTENT_TONES = {
    transactional: "green",
    commercial: "violet",
    informational: "blue",
    navigational: "neutral",
  };

  return (
    <Card>
      <CardHeader
        title="Keyword research"
        subtitle="Search keywords derived from your own profile — no invented metrics"
        action={<Badge tone="violet">Gemini</Badge>}
      />
      <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
        <div>
          <label
            htmlFor="kw-extra-context"
            className="mb-1 block text-xs font-medium text-slate-600"
          >
            Optional context to steer the analysis
          </label>
        </div>
        <textarea
          id="kw-extra-context"
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="e.g. Targeting SaaS founders in the EU; emphasize Laravel + Next.js work"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Runs against your synced profile. Every run is logged as a real,
          auditable generation.
        </p>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Analyzing…" : "Generate keywords"}
        </button>
      </form>

      {result ? (
        <div className="space-y-4 border-t border-slate-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Positioning</h3>
            <p className="mt-1 text-sm text-slate-700">{result.positioningSummary}</p>
          </div>

          <ul className="space-y-2">
            {result.keywords.map((idea) => (
              <li
                key={idea.keyword}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <Search className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                    {idea.keyword}
                  </span>
                  <Badge tone={INTENT_TONES[idea.intent] ?? "neutral"}>
                    {idea.intent}
                  </Badge>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">{idea.rationale}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  Use for: {idea.suggestedUse}
                </p>
              </li>
            ))}
          </ul>

          {result.caveats.length > 0 ? (
            <div className="rounded-lg bg-amber-50 px-3 py-2">
              <p className="text-xs font-medium text-amber-800">Caveats</p>
              <ul className="mt-1 list-inside list-disc text-xs text-amber-800">
                {result.caveats.map((caveat) => (
                  <li key={caveat}>{caveat}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {meta ? (
            <p className="text-[11px] text-slate-400">
              {meta.model} · prompt v{meta.promptVersion}
              {meta.latencyMs != null ? ` · ${(meta.latencyMs / 1000).toFixed(1)}s` : ""}
              {meta.totalTokens != null ? ` · ${meta.totalTokens} tokens` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
