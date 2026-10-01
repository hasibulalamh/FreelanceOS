/**
 * Minimal Gemini API mock for E2E tests.
 *
 * Emulates POST /v1beta/models/{model}:generateContent well enough for the
 * AI engine integration: JSON response mode envelope, usageMetadata, and
 * finishReason. Never use in production.
 *
 * Endpoints:
 *   POST /v1beta/models/:model:generateContent  → structured keyword output
 *   POST /__mode { mode }                       → "ok" | "http400" | "safety" | "malformed"
 *   POST /__reset                               → back to "ok", zero counters
 *   GET  /__stats                               → { requests }
 *
 * Usage: node tests/mock/gemini-api.mjs   (PORT env or 4403)
 */
import http from "node:http";

const PORT = Number(process.env.PORT || 4403);
let mode = "ok";
let requests = 0;

const KEYWORD_OUTPUT = {
  keywords: [
    {
      keyword: "laravel crud developer",
      intent: "commercial",
      rationale:
        "Your profile highlights Laravel CRM and admin-panel work, which matches this query.",
      suggestedUse: "profile title",
    },
    {
      keyword: "next.js freelance developer",
      intent: "transactional",
      rationale:
        "Your portfolio shows multiple production Next.js apps ready to cite in proposals.",
      suggestedUse: "service description",
    },
    {
      keyword: "full stack web application developer",
      intent: "commercial",
      rationale:
        "Combines your Laravel backend and Next.js frontend evidence into one broad head term.",
      suggestedUse: "proposal intro",
    },
  ],
  positioningSummary:
    "Full-stack freelancer with verifiable Laravel + Next.js delivery; strongest positioning is business-tool web apps.",
  caveats: [
    "Analysis is based solely on the profile text provided; no search-volume data exists.",
  ],
};

function send(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "POST" && url.pathname === "/__mode") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const parsed = JSON.parse(raw || "{}");
      mode = parsed.mode ?? "ok";
      send(res, 200, { mode });
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/__reset") {
    mode = "ok";
    requests = 0;
    send(res, 200, { mode, requests });
    return;
  }

  if (req.method === "GET" && url.pathname === "/__stats") {
    send(res, 200, { requests, mode });
    return;
  }

  const isGenerate =
    req.method === "POST" && /^\/v1beta\/models\/[^:]+:generateContent$/.test(url.pathname);
  if (!isGenerate) {
    send(res, 404, { error: { message: `Unhandled mock path: ${url.pathname}` } });
    return;
  }

  requests += 1;

  if (!req.headers["x-goog-api-key"] || req.headers["x-goog-api-key"] === "") {
    send(res, 400, { error: { message: "API key not valid. Please pass a valid API key." } });
    return;
  }

  if (mode === "http400") {
    send(res, 400, { error: { message: "Mocked upstream failure." } });
    return;
  }

  if (mode === "safety") {
    send(res, 200, {
      candidates: [{ finishReason: "SAFETY", content: { parts: [] } }],
      usageMetadata: { promptTokenCount: 50, totalTokenCount: 50 },
    });
    return;
  }

  if (mode === "malformed") {
    send(res, 200, {
      candidates: [
        { finishReason: "STOP", content: { parts: [{ text: "not json at all {" }] } },
      ],
      usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 5, totalTokenCount: 55 },
    });
    return;
  }

  send(res, 200, {
    candidates: [
      {
        finishReason: "STOP",
        content: { parts: [{ text: JSON.stringify(KEYWORD_OUTPUT) }] },
      },
    ],
    usageMetadata: {
      promptTokenCount: 412,
      candidatesTokenCount: 289,
      totalTokenCount: 701,
    },
    modelVersion: url.pathname.split("/")[3],
  });
});

server.listen(PORT, () => {
  console.warn(`[gemini-mock] listening on http://localhost:${PORT}`);
});
