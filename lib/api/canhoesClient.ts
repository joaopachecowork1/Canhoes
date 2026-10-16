"use client";

import messages from "@/messages/pt.json";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type CanhoesRequestInit = RequestInit & {
  canhoes?: { throwOnUnauthorized?: boolean; skipDeduplication?: boolean };
};

const pendingGets = new Map<string, Promise<unknown>>();

function normalizePath(path: string) {
  return path.trim().replace(/^\/+/, "").replace(/^api\//, "");
}

async function readBody(response: Response) {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try { return JSON.parse(text) as unknown; } catch { return text; }
}

const REQUEST_TIMEOUT_MS = 10_000;

function buildHeaders(requestInit: RequestInit) {
  const headers = new Headers(requestInit.headers);
  if (!headers.has("Content-Type") && !(requestInit.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

const isAuthStatus = (status: number) => status === 401 || status === 403;

function readErrorMessage(body: unknown, response: Response) {
  if (typeof body === "object" && body && "message" in body) return String(body.message);
  return response.statusText || "Request failed";
}

/** An aborted request means our timeout fired; anything else is rethrown as is. */
function toTimeoutError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError(messages.common.requestTimeout, 408);
  }
  return error;
}

/**
 * Calls `/api/<path>` and returns the parsed JSON. Errors throw `ApiError`, except 401 and 403,
 * which return null unless `throwOnUnauthorized` is set.
 * Identical GETs in flight are shared, so components can load the same data without care.
 */
export async function canhoesFetch<T>(path: string, init: CanhoesRequestInit = {}): Promise<T> {
  const { canhoes, ...requestInit } = init;
  const normalized = normalizePath(path);
  if (!normalized) throw new ApiError("Invalid API path.", 400);

  const method = (requestInit.method ?? "GET").toUpperCase();
  const key = method === "GET" && !canhoes?.skipDeduplication ? normalized : null;
  if (key && pendingGets.has(key)) return pendingGets.get(key) as Promise<T>;

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

      if (isAuthStatus(response.status) && !canhoes?.throwOnUnauthorized) return null as T;
      throw new ApiError(readErrorMessage(body, response), response.status, body);
    } catch (error) {
      throw toTimeoutError(error);
    } finally {
      clearTimeout(timeout);
      if (key) pendingGets.delete(key);
    }
  })();

  if (key) pendingGets.set(key, request);
  return request;
}
