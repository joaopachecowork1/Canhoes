/**
 * The app's logger, for the server and the browser.
 *
 * On the server each entry is one line on stdout/stderr, which is what `docker compose logs web` shows:
 *
 *   2026-10-15T16:30:00.123Z ERROR Unhandled API error {"requestId":"a1b2c3d4","error":"...","stack":"..."}
 *
 * `LOG_LEVEL` (debug, info, warn, error) sets the lowest level written; the default is `info` in
 * production and `debug` in development. In the browser, warnings and errors in production are also
 * sent to /api/telemetry/log, so they show up in the same server log.
 */

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const IS_PROD = process.env.NODE_ENV === "production";
const IS_BROWSER = typeof window !== "undefined";
const MIN_LEVEL = readLogLevel(process.env.LOG_LEVEL) ?? (IS_PROD ? "info" : "debug");

function readLogLevel(value: string | undefined): LogLevel | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error"
    ? normalized
    : null;
}

/** An Error becomes its message and stack; JSON.stringify would turn it into `{}`. */
function describeError(error: unknown) {
  if (error instanceof Error) return { error: error.message, stack: error.stack };
  return { error: String(error) };
}

function writeServerLine(level: LogLevel, message: string, context?: LogContext) {
  const json = context === undefined ? "{}" : JSON.stringify(context);
  const details = json === "{}" ? "" : ` ${json}`;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${details}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Browser errors are forwarded to /api/telemetry/log in production, where they reach the server log.
function sendToTelemetry(level: LogLevel, message: string, context?: LogContext) {
  if (!IS_PROD) return;

  fetch("/api/telemetry/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      level,
      message,
      data: context,
      url: window.location.href,
      timestamp: new Date().toISOString(),
    }),
  }).catch(() => {
    // Never report a failed report: that could loop.
  });
}

function log(level: LogLevel, message: string, context?: LogContext) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  if (!IS_BROWSER) {
    writeServerLine(level, message, context);
    return;
  }

  const prefix = `[${level.toUpperCase()}] ${message}`;
  if (level === "error") console.error(prefix, context ?? "");
  else if (level === "warn") console.warn(prefix, context ?? "");
  else console.log(prefix, context ?? "");

  if (level === "warn" || level === "error") sendToTelemetry(level, message, context);
}

export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, error?: unknown, context?: LogContext) =>
    log("error", message, error === undefined ? context : { ...context, ...describeError(error) }),
};
