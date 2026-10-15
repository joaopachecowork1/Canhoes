import { ApiError } from "@/lib/api/canhoesClient";

import { logger } from "./logger";

const DEFAULT_STATUS_MESSAGES: Partial<Record<number, string>> = {
  400: "O pedido não é válido.",
  401: "A tua sessão expirou. Entra novamente para continuar.",
  403: "Não tens permissão para fazer esta ação.",
  404: "O recurso pedido já não existe.",
  409: "O estado mudou entretanto. Atualiza a página e tenta outra vez.",
  422: "Os dados enviados não são válidos.",
  500: "O servidor falhou a processar o pedido.",
  502: "O backend não respondeu a tempo.",
  503: "O backend está temporariamente indisponível.",
};

const CODE_MESSAGES: Record<string, string> = {
  UNHANDLED_SERVER_ERROR: "O servidor encontrou um erro inesperado.",
  RATE_LIMIT_EXCEEDED: "Demasiados pedidos seguidos. Espera um pouco e tenta outra vez.",
};

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

export function getErrorMessage(error: unknown, fallback?: string): string;
export function getErrorMessage(
  error: unknown,
  fallback: string,
  statusMessages?: Partial<Record<number, string>>
): string;
export function getErrorMessage(
  error: unknown,
  fallback: string = "Ocorreu um erro",
  statusMessages?: Partial<Record<number, string>>
) {
  if (error instanceof ApiError) {
    const code = readErrorCode(error.details);
    const baseMessage =
      (code ? CODE_MESSAGES[code] : null) ??
      statusMessages?.[error.status] ??
      DEFAULT_STATUS_MESSAGES[error.status] ??
      fallback;

    return joinMessages(
      baseMessage,
      readErrorDetail(error.details) ??
        (isGenericErrorMessage(error.message) ? null : error.message)
    );
  }

  if (error instanceof Error) {
    if (/failed to fetch/i.test(error.message)) {
      return `${fallback} Verifica a ligação ao servidor.`;
    }

    const message = error.message.trim();
    return message || fallback;
  }

  return fallback;
}

export function logFrontendError(context: string, error: unknown, details?: unknown) {
  logger.error(context, error, details);
}
