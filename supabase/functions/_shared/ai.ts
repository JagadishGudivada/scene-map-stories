// Shared helpers for AI-backed edge functions: SSE streaming, a retrying
// chat-completions caller, and small request/response utilities. Extracted from
// title-details so location-details (and future functions) can reuse one
// implementation instead of copy-pasting.

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/**
 * Wrap an async producer in a Server-Sent Events stream. `send(event, data)`
 * emits one SSE frame; thrown errors are surfaced as an `error` event so the
 * client's reader always sees a terminal frame before the stream closes.
 */
export function sseResponse(
  run: (send: (event: string, data: unknown) => void) => Promise<void>,
  headers: Record<string, string> = {},
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        await run(send);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export interface CallAiOptions {
  url: string;
  apiKey: string;
  timeoutMs: number;
  maxAttempts?: number;
  logger?: { error: (message: string, err?: unknown) => void };
}

/**
 * POST a chat-completions payload with a per-attempt timeout and exponential
 * backoff. Terminal statuses (ok / 429 / 402 / 400) short-circuit the retry
 * loop and are returned to the caller to handle; transient failures are retried.
 */
export async function callAi(payload: unknown, opts: CallAiOptions): Promise<Response> {
  const { url, apiKey, timeoutMs, maxAttempts = 3, logger } = opts;
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const r = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (r.ok || r.status === 429 || r.status === 402 || r.status === 400) return r;
      lastResp = r;
    } catch (err) {
      logger?.error(`AI fetch attempt ${attempt + 1} failed`, err);
    }
    await new Promise((res) => setTimeout(res, 500 * Math.pow(2, attempt)));
  }
  return lastResp ?? new Response("upstream unavailable", { status: 502 });
}

export function isTruthyEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null) return defaultValue;
  return !["0", "false", "no", "off"].includes(value.toLowerCase());
}

export type ReasoningEffort = "none" | "minimal" | "low" | "medium" | "high";

export function resolveReasoningEffort(model: string, requested: string): ReasoningEffort {
  const valid = new Set(["none", "minimal", "low", "medium", "high"]);
  const normalized = valid.has(requested) ? requested : "minimal";
  // Gemini 3 family does not support fully disabling thinking.
  if (model.toLowerCase().includes("gemini-3") && normalized === "none") {
    return "minimal";
  }
  return normalized as ReasoningEffort;
}
