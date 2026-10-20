import { ApiError } from "@/lib/api/canhoesClient";

import { logger } from "./logger";
import messages from "@/messages/pt.json";

// Mensagens por estado HTTP e por código de erro, vindas de `messages/pt.json`.
const DEFAULT_STATUS_MESSAGES: Partial<Record<number, string>> = messages.errors.byStatus;

const CODE_MESSAGES: Record<string, string> = messages.errors.byCode;

/** Procura um texto útil nos detalhes do erro (uma string ou um campo `message`, `detail`, `title` ou `error`). */
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

/** O `code` do corpo de erro da API, se existir. */
function readErrorCode(details: unknown) {
  if (!details || typeof details !== "object") return null;
  const value = (details as Record<string, unknown>).code;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Mensagens genéricas de fetch/servidor que não dizem nada ao utilizador. */
function isGenericErrorMessage(message: string) {
  return /^(request failed|failed to fetch|internal server error)$/i.test(message.trim());
}

/** Junta a mensagem base ao detalhe, sem repetir nem acrescentar texto genérico. */
function joinMessages(base: string, detail: string | null) {
  if (!detail || detail === base || isGenericErrorMessage(detail)) {
    return base;
  }

  if (base.endsWith(".") || base.endsWith("!") || base.endsWith("?")) {
    return `${base} ${detail}`;
  }

  return `${base}: ${detail}`;
}

/** Prioridade: código de erro conhecido, depois a mensagem de quem chama para o estado, depois a genérica. */
function getApiErrorMessage(error: ApiError, fallback: string, statusMessages?: Partial<Record<number, string>>) {
  const code = readErrorCode(error.details);
  const baseMessage =
    (code ? CODE_MESSAGES[code] : null) ??
    statusMessages?.[error.status] ??
    DEFAULT_STATUS_MESSAGES[error.status] ??
    fallback;
  const detail = readErrorDetail(error.details) ?? (isGenericErrorMessage(error.message) ? null : error.message);
  return joinMessages(baseMessage, detail);
}

/** Mensagem para o utilizador a partir de qualquer erro: a do código ou do estado da API (com substituição opcional por estado), mais o detalhe do servidor quando acrescenta algo. */
export function getErrorMessage(error: unknown, fallback?: string): string;
export function getErrorMessage(
  error: unknown,
  fallback: string,
  statusMessages?: Partial<Record<number, string>>,
): string;
export function getErrorMessage(
  error: unknown,
  fallback: string = messages.errors.fallback,
  statusMessages?: Partial<Record<number, string>>,
) {
  if (error instanceof ApiError) return getApiErrorMessage(error, fallback, statusMessages);

  if (error instanceof Error) {
    // Falha de rede: o browser não chegou ao servidor.
    if (/failed to fetch/i.test(error.message)) {
      return `${fallback} ${messages.errors.checkConnection}`;
    }

    const message = error.message.trim();
    return message || fallback;
  }

  return fallback;
}

/** Regista um erro do cliente com o sítio onde ocorreu e contexto extra. */
export function logFrontendError(context: string, error: unknown, details?: Record<string, unknown>) {
  logger.error(context, error, details);
}
