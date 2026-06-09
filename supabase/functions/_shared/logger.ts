// Shared structured logger for Supabase Edge Functions.
//
// - Emits single-line JSON to stdout (info/debug) and stderr (warn/error)
//   so Supabase log explorer can parse fields out of `event_message`.
// - Levels: debug < info < warn < error. Default min level = "info".
//   Override with LOG_LEVEL env var. Force debug with DEBUG=1.
// - Attach a per-request logger via `logger.forRequest(req, fnName)` to get
//   automatic request_id + duration_ms on every line and a `.end(status)`
//   helper to emit a single request-completed summary.
//
// Usage:
//   import { createLogger } from "../_shared/logger.ts";
//   const log = createLogger("title-details");
//   serve(async (req) => {
//     const rlog = log.forRequest(req);
//     rlog.info("handling request", { slug });
//     try {
//       ...
//       rlog.end(200, { cache: "hit" });
//       return res;
//     } catch (e) {
//       rlog.error("handler failed", e);
//       rlog.end(500);
//       throw e;
//     }
//   });

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function resolveMinLevel(): LogLevel {
  const debugFlag = (Deno.env.get("DEBUG") || "").toLowerCase();
  if (["1", "true", "yes", "on"].includes(debugFlag)) return "debug";
  const raw = (Deno.env.get("LOG_LEVEL") || "info").toLowerCase() as LogLevel;
  return (LEVELS[raw] ? raw : "info");
}

const MIN_LEVEL = resolveMinLevel();
const ENV = Deno.env.get("DENO_ENV") || Deno.env.get("ENV") || "production";

function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack?.split("\n").slice(0, 8).join("\n"),
    };
  }
  if (typeof err === "object" && err !== null) {
    try { return JSON.parse(JSON.stringify(err)); } catch { return { value: String(err) }; }
  }
  return { value: String(err) };
}

function safeStringify(obj: unknown): string {
  try { return JSON.stringify(obj); } catch {
    const seen = new WeakSet();
    return JSON.stringify(obj, (_k, v) => {
      if (typeof v === "object" && v !== null) {
        if (seen.has(v)) return "[Circular]";
        seen.add(v);
      }
      return v;
    });
  }
}

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, err?: unknown, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
  forRequest(req: Request, extra?: Record<string, unknown>): RequestLogger;
}

export interface RequestLogger extends Logger {
  requestId: string;
  end(status: number, fields?: Record<string, unknown>): void;
}

function emit(
  level: LogLevel,
  fn: string,
  base: Record<string, unknown>,
  message: string,
  fields?: Record<string, unknown>,
) {
  if (LEVELS[level] < LEVELS[MIN_LEVEL]) return;
  const line = {
    ts: new Date().toISOString(),
    level,
    env: ENV,
    fn,
    msg: message,
    ...base,
    ...(fields || {}),
  };
  const out = safeStringify(line);
  if (level === "error" || level === "warn") console.error(out);
  else console.log(out);
}

function makeLogger(fn: string, base: Record<string, unknown> = {}): Logger {
  return {
    debug: (m, f) => emit("debug", fn, base, m, f),
    info: (m, f) => emit("info", fn, base, m, f),
    warn: (m, f) => emit("warn", fn, base, m, f),
    error: (m, err, f) => emit("error", fn, base, m, { ...(f || {}), error: err === undefined ? undefined : serializeError(err) }),
    child: (fields) => makeLogger(fn, { ...base, ...fields }),
    forRequest: (req, extra) => {
      const rid = req.headers.get("x-request-id") || crypto.randomUUID();
      const startedAt = Date.now();
      const url = new URL(req.url);
      const reqBase = {
        ...base,
        request_id: rid,
        method: req.method,
        path: url.pathname,
        ...(extra || {}),
      };
      const inner = makeLogger(fn, reqBase);
      const reqLogger: RequestLogger = {
        ...inner,
        requestId: rid,
        end: (status, fields) => {
          emit(status >= 500 ? "error" : status >= 400 ? "warn" : "info", fn, reqBase, "request completed", {
            status,
            duration_ms: Date.now() - startedAt,
            ...(fields || {}),
          });
        },
      };
      return reqLogger;
    },
  };
}

export function createLogger(fnName: string): Logger {
  return makeLogger(fnName);
}

export const logLevel = MIN_LEVEL;
