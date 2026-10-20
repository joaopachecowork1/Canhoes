/**
 * O logger da app, para o servidor e para o browser.
 *
 * No servidor cada entrada é uma linha em stdout/stderr, que é o que `docker compose logs web` mostra:
 *
 *   2026-10-15T16:30:00.123Z ERROR Unhandled API error {"requestId":"a1b2c3d4","error":"...","stack":"..."}
 *
 * `LOG_LEVEL` (debug, info, warn, error) define o nível mais baixo escrito; por defeito é `info` em
 * produção e `debug` em desenvolvimento. No browser, os avisos e erros em produção são também
 * enviados para /api/telemetry/log, para aparecerem no mesmo log do servidor.
 */

/** Níveis de gravidade, do menos ao mais grave. */
type LogLevel = "debug" | "info" | "warn" | "error";
/** Dados extra que acompanham uma mensagem de log. */
type LogContext = Record<string, unknown>;

// Ordem numérica para comparar níveis com o mínimo configurado.
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const IS_PROD = process.env.NODE_ENV === "production";
const IS_BROWSER = typeof window !== "undefined";
const MIN_LEVEL = readLogLevel(process.env.LOG_LEVEL) ?? (IS_PROD ? "info" : "debug");

/** Lê um nível válido de `LOG_LEVEL`, ou null quando falta ou é desconhecido. */
function readLogLevel(value: string | undefined): LogLevel | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "debug" || normalized === "info" || normalized === "warn" || normalized === "error"
    ? normalized
    : null;
}

/** Um Error passa a mensagem e stack; o JSON.stringify transformá-lo-ia em `{}`. */
function describeError(error: unknown) {
  if (error instanceof Error) return { error: error.message, stack: error.stack };
  return { error: String(error) };
}

/** Escreve uma entrada numa linha `<hora> <NÍVEL> <mensagem> {contexto}`. */
function writeServerLine(level: LogLevel, message: string, context?: LogContext) {
  const json = context === undefined ? "{}" : JSON.stringify(context);
  const details = json === "{}" ? "" : ` ${json}`;
  const line = `${new Date().toISOString()} ${level.toUpperCase()} ${message}${details}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

// Em produção, os erros do browser seguem para /api/telemetry/log e chegam ao log do servidor.
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
    // Nunca reportar um reporte falhado: poderia entrar em ciclo.
  });
}

/** Escreve uma entrada se o nível passar o mínimo, no formato do servidor ou do browser. */
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

/** Logger da app: usar em vez de `console.*`. O `error` aceita o erro capturado antes do contexto. */
export const logger = {
  debug: (message: string, context?: LogContext) => log("debug", message, context),
  info: (message: string, context?: LogContext) => log("info", message, context),
  warn: (message: string, context?: LogContext) => log("warn", message, context),
  error: (message: string, error?: unknown, context?: LogContext) =>
    log("error", message, error === undefined ? context : { ...context, ...describeError(error) }),
};
