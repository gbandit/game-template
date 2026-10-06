import { getAccessToken } from "@/lib/auth";
import { gbanditOrigin } from "@/lib/gbandit";

const INGEST_URL = `${gbanditOrigin("platform")}/api/ingest/frontend-logs`;
// Cap per request so a runaway error loop doesn't produce an enormous payload.
const MAX_BATCH_SIZE = 20;

interface LogEvent {
  level?: "error" | "warn" | "log";
  message: string;
  stack?: string;
  url?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack || `${arg.name}: ${arg.message}`;
  if (typeof arg === "string") return arg;
  if (arg === undefined) return "undefined";
  if (arg === null) return "null";
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function firstStack(args: unknown[]): string | undefined {
  for (const arg of args) {
    if (arg instanceof Error && arg.stack) return arg.stack;
  }
  return undefined;
}

const pendingEvents: LogEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

export function reportError(message: string, metadata?: Record<string, unknown>) {
  enqueue({ level: "error", message, metadata });
}

function enqueue(event: LogEvent) {
  // Drop anything that looks like it came from our own ingest request —
  // the browser may log CORS/network failures even though we .catch() them,
  // and capturing those would create a loop.
  if (event.message.includes(INGEST_URL) || event.stack?.includes(INGEST_URL)) {
    return;
  }

  event.url = event.url ?? window.location.href;
  event.timestamp = event.timestamp ?? new Date().toISOString();
  pendingEvents.push(event);

  // Flush on next tick: events fired in the same synchronous burst
  // (e.g. a render loop) get coalesced into one request, but a single
  // event is sent essentially immediately so devs see it in `gbandit logs`
  // right away.
  if (!flushTimer) {
    flushTimer = setTimeout(flush, 0);
  }
}

async function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (pendingEvents.length === 0) return;

  const batch = pendingEvents.splice(0, MAX_BATCH_SIZE);
  const headers: Record<string, string> = { "content-type": "application/json" };
  // Attach Bearer token if available. Swallow any errors from token minting —
  // unhandled rejections here would re-trigger our own error handler.
  try {
    headers["authorization"] = `Bearer ${await getAccessToken()}`;
  } catch {
    // Send anonymously rather than failing the report.
  }

  // Fire-and-forget — re-queueing risks an infinite error loop.
  fetch(INGEST_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ logs: batch }),
    keepalive: true,
  }).catch(() => {});
}

export function initErrorReporter() {
  if (initialized) return;
  initialized = true;

  window.addEventListener("error", (event) => {
    enqueue({
      level: "error",
      message: event.message || "Uncaught error",
      stack: event.error?.stack,
      url: event.filename
        ? `${event.filename}:${event.lineno}:${event.colno}`
        : window.location.href,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: string; stack?: string } | string | undefined;
    const message =
      typeof reason === "string"
        ? reason
        : reason?.message || "Unhandled promise rejection";
    const stack = typeof reason === "object" ? reason?.stack : undefined;
    enqueue({ level: "error", message, stack });
  });

  // Wrap console methods so dev logs show up in `gbandit logs frontend`.
  // We preserve the originals so the browser DevTools console still works as
  // usual. Capture from the wrapped function — the original is called below.
  for (const level of ["log", "warn", "error"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      try {
        enqueue({
          level,
          message: args.map(formatArg).join(" "),
          stack: firstStack(args),
        });
      } catch {
        // Never let logging crash the app.
      }
    };
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}
