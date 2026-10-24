"use client";

import messages from "@/messages/pt.json";

/** Erro de um pedido à API, com o estado HTTP e o corpo da resposta em `details`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Opções do `fetch` mais as nossas: silenciar erros de autenticação (401/403) ou desligar a partilha de GETs iguais. */
type CanhoesRequestInit = RequestInit & {
  canhoes?: {
    throwOnUnauthorized?: boolean;
    swallowAuthErrors?: boolean;
    skipDeduplication?: boolean;
  };
};

// GETs em curso por caminho, para pedidos iguais partilharem a mesma promessa.
const pendingGets = new Map<string, Promise<unknown>>();

/** Tira espaços, barras iniciais e o prefixo `api/` para o caminho ficar relativo a `/api`. */
function normalizePath(path: string) {
  return path
    .trim()
    .replace(/^\/+/, "")
    .replace(/^api\//, "");
}

/** Lê o corpo da resposta: JSON quando possível, senão texto; vazio ou 204 dá undefined. */
async function readBody(response: Response) {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

// Passado este tempo o pedido é abortado.
const REQUEST_TIMEOUT_MS = 10_000;

/** Cabeçalhos do pedido: JSON por defeito, exceto em FormData (o browser põe o boundary). */
function buildHeaders(requestInit: RequestInit) {
  const headers = new Headers(requestInit.headers);
  if (!headers.has("Content-Type") && !(requestInit.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

/** 401 e 403 indicam falta de sessão ou de permissão. */
const isAuthStatus = (status: number) => status === 401 || status === 403;

/** A mensagem do corpo de erro, ou o texto do estado HTTP. */
function readErrorMessage(body: unknown, response: Response) {
  if (typeof body === "object" && body && "message" in body) return String(body.message);
  return response.statusText || "Request failed";
}

/** Um pedido abortado significa que o nosso timeout disparou; qualquer outro erro passa como está. */
function toTimeoutError(error: unknown) {
  // Verifica-se pelo nome: a classe DOMException difere entre ambientes (browser, Node, jsdom).
  if (error instanceof Error && error.name === "AbortError") {
    return new ApiError(messages.common.requestTimeout, 408);
  }
  return error;
}

/**
 * Chama `/api/<path>` e devolve o JSON lido. Os erros lançam `ApiError`, exceto 401 e 403 num GET,
 * que devolvem null a não ser que `throwOnUnauthorized` esteja ativo.
 * GETs iguais em curso são partilhados, por isso os componentes podem pedir os mesmos dados sem cuidados.
 */
export async function canhoesFetch<T>(path: string, init: CanhoesRequestInit = {}): Promise<T> {
  const { canhoes, ...requestInit } = init;
  const normalized = normalizePath(path);
  if (!normalized) throw new ApiError("Invalid API path.", 400);

  const method = (requestInit.method ?? "GET").toUpperCase();
  const key = method === "GET" && !canhoes?.skipDeduplication ? normalized : null;
  if (key && pendingGets.has(key)) return pendingGets.get(key) as Promise<T>;

  // Só os GETs são partilhados; uma escrita nunca reaproveita outro pedido.
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`/api/${normalized}`, {
        ...requestInit,
        headers: buildHeaders(requestInit),
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      const body = await readBody(response);
      if (response.ok) return body as T;

      // Por defeito propaga erros de autenticação (401/403) para o caller/TanStack Query poder agir (redirecionar/tratar).
      // Apenas devolve null se o caller solicitar explicitamente swallowAuthErrors.
      const shouldThrowOnAuth = canhoes?.throwOnUnauthorized ?? !canhoes?.swallowAuthErrors;
      if (isAuthStatus(response.status) && method === "GET" && !shouldThrowOnAuth) return null as T;
      throw new ApiError(readErrorMessage(body, response), response.status, body);
    } catch (error) {
      throw toTimeoutError(error);
    } finally {
      // Limpa o timeout e liberta o GET partilhado, tenha corrido bem ou mal.
      clearTimeout(timeout);
      if (key) pendingGets.delete(key);
    }
  })();

  if (key) pendingGets.set(key, request);
  return request;
}
