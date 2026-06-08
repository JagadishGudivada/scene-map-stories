// Shared Vertex Gemini call helper for enrichment functions.
// Handles structured JSON output, optional Google Search grounding,
// auto-retry without grounding, and timeout fallback.

export type SourceEvidence = {
  url: string;
  title?: string;
  snippet?: string;
};

export type VertexGenerateResult<T> = {
  payload: T;
  evidence: SourceEvidence[];
  grounded: boolean;
};

const GCP_PROJECT_ID = Deno.env.get("GCP_PROJECT_ID") || "";
const GCP_LOCATION = Deno.env.get("GCP_LOCATION") || "us-central1";
const VERTEX_MODEL_DEFAULT = Deno.env.get("VERTEX_MODEL_ENRICHMENT") || "gemini-2.5-flash";
const VERTEX_TIMEOUT_MS = Number(Deno.env.get("VERTEX_TIMEOUT_MS") || "30000");
const VERTEX_MAX_OUTPUT_TOKENS = Number(Deno.env.get("VERTEX_MAX_OUTPUT_TOKENS") || "4096");
const VERTEX_GROUNDING_ENABLED = !["0", "false", "no", "off"].includes(
  (Deno.env.get("VERTEX_GROUNDING_ENABLED") || "true").toLowerCase()
);

export function parseJsonFromText<T>(content: string): T {
  const trimmed = content.trim();
  const deFenced = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(deFenced);
  } catch {
    const firstBrace = deFenced.indexOf("{");
    const lastBrace = deFenced.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(deFenced.slice(firstBrace, lastBrace + 1));
    }
    throw new Error("Could not parse JSON response from Vertex");
  }
}

export function isTimeoutError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("timed out") || msg.includes("signal timed out");
}

export function isParseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message.toLowerCase() : "";
  return msg.includes("parse json") || msg.includes("could not parse json");
}

export type CallVertexOptions = {
  prompt: string;
  responseSchema: Record<string, unknown>;
  withGrounding?: boolean;
  model?: string;
  temperature?: number;
};

export async function callVertexGenerate<T>(
  accessToken: string,
  opts: CallVertexOptions
): Promise<VertexGenerateResult<T>> {
  if (!GCP_PROJECT_ID) throw new Error("GCP_PROJECT_ID is not configured");
  const model = opts.model || VERTEX_MODEL_DEFAULT;
  const withGrounding = opts.withGrounding ?? VERTEX_GROUNDING_ENABLED;

  const url = `https://${GCP_LOCATION}-aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/${GCP_LOCATION}/publishers/google/models/${model}:generateContent`;

  const requestBody: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: VERTEX_MAX_OUTPUT_TOKENS,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
    },
  };
  if (withGrounding) requestBody.tools = [{ googleSearch: {} }];

  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      signal: AbortSignal.timeout(VERTEX_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!res.ok) {
      lastStatus = res.status;
      lastBody = await res.text();
      if (res.status === 429) throw new Error("Vertex rate-limited the request");
      if (res.status === 402) throw new Error("Vertex credits exhausted");
      if (res.status >= 500 && attempt === 0) continue;
      if (withGrounding && res.status === 400) {
        throw new Error(`Vertex grounding rejected: ${lastBody.slice(0, 300)}`);
      }
      throw new Error(`Vertex request failed (${res.status}): ${lastBody.slice(0, 300)}`);
    }

    const data = await res.json();
    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    const textPart = Array.isArray(parts)
      ? parts.find((p: unknown) => typeof (p as { text?: string })?.text === "string")
      : null;
    const text = typeof textPart?.text === "string" ? textPart.text : "";
    if (!text) throw new Error("Vertex returned an empty response payload");

    const payload = parseJsonFromText<T>(text);

    const chunks = Array.isArray(candidate?.groundingMetadata?.groundingChunks)
      ? candidate.groundingMetadata.groundingChunks
      : [];
    const evidence: SourceEvidence[] = chunks
      .map((c: any) => {
        const web = c?.web || {};
        const uri = typeof web?.uri === "string" ? web.uri : "";
        if (!uri) return null;
        return { url: uri, title: typeof web?.title === "string" ? web.title : undefined };
      })
      .filter(Boolean);

    return { payload, evidence, grounded: withGrounding };
  }

  throw new Error(`Vertex request failed (${lastStatus}): ${lastBody.slice(0, 300)}`);
}

/**
 * Helper that wraps a callVertexGenerate invocation with grounding-on
 * first, then automatically retries without grounding on grounding/parse
 * errors. Returns null if all attempts fail (caller logs and skips).
 */
export async function generateWithFallback<T>(
  accessToken: string,
  opts: CallVertexOptions,
  logPrefix: string
): Promise<VertexGenerateResult<T> | null> {
  try {
    return await callVertexGenerate<T>(accessToken, opts);
  } catch (firstError) {
    if (!opts.withGrounding && opts.withGrounding !== undefined) {
      console.error(`${logPrefix} vertex call failed`, firstError);
      return null;
    }
    console.warn(`${logPrefix} grounding attempt failed, retrying without grounding`, firstError);
    try {
      return await callVertexGenerate<T>(accessToken, { ...opts, withGrounding: false });
    } catch (secondError) {
      if (isTimeoutError(secondError) || isParseError(secondError)) {
        console.warn(`${logPrefix} retry without grounding failed`, secondError);
      } else {
        console.error(`${logPrefix} vertex final failure`, secondError);
      }
      return null;
    }
  }
}
