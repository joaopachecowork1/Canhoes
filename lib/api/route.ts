import { NextResponse, type NextRequest } from "next/server";
import type { ZodType } from "zod";

import { badRequest, HttpError } from "@/lib/api/httpError";
import { logger } from "@/lib/logger";
import { ProposalStatusSchema } from "@/lib/zod/common";

/**
 * Building blocks for route handlers in `app/api`.
 *
 *   export const GET = apiRoute<{ eventId: string }>(async (request, { eventId }) => {
 *     const user = await requireUser();
 *     const { skip, take } = readPaging(request);
 *     return json(await listSomething(eventId, skip, take));
 *   });
 *
 * Handlers throw an `HttpError` (lib/api/httpError) to stop with an error response; `apiRoute`
 * turns it into `{ code, message }` JSON. Anything else that is thrown becomes a logged 500.
 *
 * Every request is logged with its method, path, status and duration (see `logRequest`), and gets an
 * `X-Request-Id` header. A 500 carries the same id in its body, so a failure a user reports can be
 * found in the server log with `docker compose logs web | grep <id>`.
 */

type RouteContext<Params> = { params: Promise<Params> };

/** Wraps a route handler: resolves its params, logs the request with a `requestId` and turns errors into JSON responses (`HttpError` keeps its status, anything else is a logged 500). */
export function apiRoute<Params = Record<string, never>>(
  handler: (request: NextRequest, params: Params) => Promise<Response>,
) {
  return async (request: NextRequest, context: RouteContext<Params>) => {
    const requestId = crypto.randomUUID().slice(0, 8);
    const startedAt = Date.now();

    let response: Response;
    try {
      response = await handler(request, await context.params);
    } catch (error) {
      response = toErrorResponse(error, requestId);
    }

    response.headers.set("X-Request-Id", requestId);
    logRequest(request, response.status, { requestId, durationMs: Date.now() - startedAt });
    return response;
  };
}

function toErrorResponse(error: unknown, requestId: string) {
  if (error instanceof HttpError) {
    const body =
      error.details === undefined
        ? { code: error.code, message: error.message }
        : { code: error.code, message: error.message, details: error.details };
    return NextResponse.json(body, { status: error.status });
  }

  logger.error("Unhandled API error", error, { requestId });
  return NextResponse.json(
    { code: "UNHANDLED_SERVER_ERROR", message: "Unexpected server error.", requestId },
    { status: 500 },
  );
}

/**
 * Successful reads (feed pages, images) are `debug`, so the default `info` level shows only writes
 * and failures; LOG_LEVEL=debug shows every request.
 */
function logRequest(request: NextRequest, status: number, context: { requestId: string; durationMs: number }) {
  const message = `${request.method} ${request.nextUrl.pathname} ${status}`;
  if (status >= 500) logger.error(message, undefined, context);
  else if (status >= 400 || request.method !== "GET") logger.info(message, context);
  else logger.debug(message, context);
}

/** A JSON response with the given status (200 by default). */
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

/** An empty 204 response, for writes that return nothing. */
export function noContent() {
  return new NextResponse(null, { status: 204 });
}

/** Parses the JSON body with `schema`. Malformed JSON or invalid input becomes a 400. */
export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest("Invalid JSON body.");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw badRequest(parsed.error.issues[0]?.message ?? "Invalid input.", parsed.error.flatten());
  }
  return parsed.data;
}

/** The uploaded file in form field `field`, or a 400 when it is missing or empty. */
export async function readFormFile(request: Request, field = "file"): Promise<File> {
  const file = (await request.formData()).get(field);
  if (!(file instanceof File) || file.size <= 0) {
    throw new HttpError(400, "FILE_REQUIRED", "File is required.");
  }
  return file;
}

type PagingOptions = { defaultTake?: number; maxTake?: number };

/** `skip`/`take` from the query string: missing or invalid values fall back to the defaults, `take` is capped. */
export function readPaging(request: NextRequest, { defaultTake = 50, maxTake = 200 }: PagingOptions = {}) {
  const params = request.nextUrl.searchParams;
  const skip = parseInteger(params.get("skip")) ?? 0;
  const take = parseInteger(params.get("take")) ?? defaultTake;
  return {
    skip: Math.max(0, skip),
    take: Math.min(maxTake, Math.max(1, take)),
  };
}

/** The optional `?status=` filter of an admin list: one of pending, approved or rejected, or null when absent (400 for anything else). */
export function readStatusFilter(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status");
  if (!status) return null;
  const parsed = ProposalStatusSchema.safeParse(status);
  if (!parsed.success) throw badRequest("Invalid status filter.");
  return parsed.data;
}

function parseInteger(value: string | null) {
  if (value === null) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
