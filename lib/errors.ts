import { ApiError } from "@/lib/api/canhoesClient";

import { logger } from "./logger";
import messages from "@/messages/pt.json";

const DEFAULT_STATUS_MESSAGES: Partial<Record<number, string>> = messages.errors.byStatus;

const CODE_MESSAGES: Record<string, string> = messages.errors.byCode;

function readErrorDetail(details: unknown) {
  if (typeof details === "string") {
    const normalized = details.trim();
    return normalized || null;
  }

  if (!details || typeof details !== "object") {
    return null;
  }

  for (const key of ["message", "detail", "title", "error"]) {
    const value = (details as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readErrorCode(details: unknown) {
  if (!details || typeof details !== "object") return null;
  const value = (details as Record<string, unknown>).code;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isGenericErrorMessage(message: string) {
  return /^(request failed|failed to fetch|internal server error)$/i.test(
    message.trim()
  );
}

function joinMessages(base: string, detail: string | null) {
  if (!detail || detail === base || isGenericErrorMessage(detail)) {
    return base;
  }

  if (base.endsWith(".") || base.endsWith("!") || base.endsWith("?")) {
    return `${base} ${detail}`;
  }

  return `${base}: ${detail}`;
}

/** Known error code first, then the caller's message for the status, then a generic one. */
function getApiErrorMessage(error: ApiError, fallback: string, statusMessages?: Partial<Record<number, string>>) {
  const code = readErrorCode(error.details);
  const baseMessage =
    (code ? CODE_MESSAGES[code] : null) ?? statusMessages?.[error.status] ?? DEFAULT_STATUS_MESSAGES[error.status] ?? fallback;
  const detail = readErrorDetail(error.details) ?? (isGenericErrorMessage(error.message) ? null : error.message);
  return joinMessages(baseMessage, detail);
}

export function getErrorMessage(error: unknown, fallback?: string): string;
export function getErrorMessage(
  error: unknown,
  fallback: string,
  statusMessages?: Partial<Record<number, string>>
): string;
export function getErrorMessage(
  error: unknown,
  fallback: string = messages.errors.fallback,
  statusMessages?: Partial<Record<number, string>>
) {
  if (error instanceof ApiError) return getApiErrorMessage(error, fallback, statusMessages);

  if (error instanceof Error) {
    if (/failed to fetch/i.test(error.message)) {
      return `${fallback} ${messages.errors.checkConnection}`;
    }

    const message = error.message.trim();
    return message || fallback;
  }

  return fallback;
}

export function logFrontendError(context: string, error: unknown, details?: Record<string, unknown>) {
  logger.error(context, error, details);
}
