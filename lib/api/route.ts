import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";

import { badRequest, HttpError } from "@/lib/api/httpError";
import { logger } from "@/lib/logger";
import { ProposalStatusSchema } from "@/lib/zod/common";

/**
 * Peças para construir os route handlers em `app/api`.
 *
 *   export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
 *     const user = await requireUser();
 *     const { skip, take } = readPaging(request);
 *     return json(await listSomething(eventId, skip, take));
 *   });
 *
 * Os handlers lançam um `HttpError` (lib/api/httpError) para parar com uma resposta de erro; o
 * `apiRoute` converte-o em JSON `{ code, message }`. Qualquer outro erro lançado vira um 500 registado.
 *
 * Cada pedido é registado com método, caminho, estado e duração (ver `logRequest`) e recebe o
 * cabeçalho `X-Request-Id`. Um 500 leva o mesmo id no corpo, para que uma falha reportada por um
 * utilizador se encontre no log do servidor com `docker compose logs web | grep <id>`.
 */

/** Contexto que o Next passa a um route handler: os parâmetros da rota chegam como promessa. */
type RouteContext<Params> = { params: Promise<Params> };

/** Envolve um route handler: resolve os parâmetros, regista o pedido com um `requestId` e converte erros em respostas JSON (`HttpError` mantém o estado, o resto é um 500 registado). */
export function apiRoute<Params = Record<string, never>>(
  handler: (request: NextRequest, params: Params) => Promise<Response>,
) {
  return async (request: NextRequest, context: RouteContext<Params>) => {
    // Id curto, suficiente para encontrar o pedido no log.
    const requestId = crypto.randomUUID().slice(0, 8);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await handler(request, await context.params);
    } catch (error) {
      response = toErrorResponse(error, requestId);
    }

    // Devolve o id também no cabeçalho, para sucesso e erro.
    response.headers.set("X-Request-Id", requestId);
    logRequest(request, response.status, { requestId, durationMs: Date.now() - startedAt });
    return response;
  };
}

/** Converte um erro lançado pelo handler na resposta JSON de erro. */
function toErrorResponse(error: unknown, requestId: string) {
  // Erro esperado: o cliente recebe o código e a mensagem (e os detalhes, se existirem).
  if (error instanceof HttpError) {
    const body: Record<string, unknown> = { code: error.code, message: error.message };
    if (error.details !== undefined) body.details = error.details;
    return NextResponse.json(body, { status: error.status });
  }

  // Erro inesperado: fica no log com o requestId e o cliente só vê uma mensagem genérica.
  logger.error("Unhandled API error", error, { requestId });
  return NextResponse.json(
    { code: "UNHANDLED_SERVER_ERROR", message: "Unexpected server error.", requestId },
    { status: 500 },
  );
}

/**
 * Os GET bem-sucedidos (páginas do feed, imagens) são `debug`, por isso o nível `info` por defeito
 * mostra só escritas e falhas; com LOG_LEVEL=debug aparecem todos os pedidos.
 */
function logRequest(request: NextRequest, status: number, context: { requestId: string; durationMs: number }) {
  const message = `${request.method} ${request.nextUrl.pathname} ${status}`;
  if (status >= 500) {
    logger.error(message, undefined, context);
    return;
  }
  if (status >= 400 || request.method !== "GET") {
    logger.info(message, context);
    return;
  }
  logger.debug(message, context);
}

/** Uma resposta JSON com o estado indicado (200 por defeito). */
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

/** Uma resposta 204 vazia, para escritas que não devolvem nada. */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Valida os dados com o `schema` Zod ou lança um 400 com a primeira mensagem de erro. */
function parseWithSchema<T>(body: unknown, schema: ZodType<T>): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid input.", parsed.error.flatten());
  }
  return parsed.data;
}

/** Lê o corpo JSON e valida-o com `schema`. JSON mal formado ou input inválido dá um 400. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Invalid JSON body.");
  }
  return parseWithSchema(body, schema);
}

/** Lê o corpo JSON se existir e valida-o com `schema`; devolve `fallback` se o corpo estiver vazio. */
export async function readOptionalJson<T>(request: Request, schema: ZodType<T>, fallback: T): Promise<T> {
  const text = await request.text();
  if (text.trim().length === 0) return fallback;

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw badRequest("Invalid JSON body.");
  }
  return parseWithSchema(body, schema);
}

/** O ficheiro enviado no campo `field` do formulário, ou um 400 quando falta ou está vazio. */
export async function readFormFile(request: Request, field = "file"): Promise<File> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    throw badRequest("Invalid form data.");
  }
  const file = formData.get(field);
  if (!(file instanceof File) || file.size <= 0) {
    throw new HttpError(400, "FILE_REQUIRED", "File is required.");
  }
  return file;
}

/** Valores por defeito e máximo de `take` para `readPaging`. */
type PagingOptions = { defaultTake?: number; maxTake?: number };

/** `skip`/`take` do query string: valores em falta ou inválidos usam os defeitos e `take` tem um teto. */
export function readPaging(request: NextRequest, { defaultTake = 50, maxTake = 200 }: PagingOptions = {}) {
  const params = request.nextUrl.searchParams;
  const skip = parseInteger(params.get("skip")) ?? 0;
  const take = parseInteger(params.get("take")) ?? defaultTake;
  return {
    skip: Math.max(0, skip),
    take: Math.min(maxTake, Math.max(1, take)),
  };
}

/** O filtro opcional `?status=` de uma lista de admin: pending, approved ou rejected, ou null se ausente (400 para o resto). */
export function readStatusFilter(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  if (!status) return null;
  const parsed = ProposalStatusSchema.safeParse(status);
  if (!parsed.success) throw badRequest("Invalid status filter.");
  return parsed.data;
}

/** Converte para inteiro, ou null quando falta ou não é um número. */
function parseInteger(value: string | null) {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
