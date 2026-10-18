/**
 * An error that a route handler turns into a `{ code, message }` JSON response with `status`
 * (see `apiRoute`). Domain errors that callers can act on extend it, so services stay free of
 * response handling.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** A 400 for input the route cannot accept, with optional details for the client. */
export function badRequest(message: string, details?: unknown) {
  return new HttpError(400, "VALIDATION_ERROR", message, details);
}

/** A 401 for a request without a session. */
export function unauthorized() {
  return new HttpError(401, "UNAUTHORIZED", "Authentication required.");
}

/** A 404 for a resource that does not exist in this event (or that the user may not see). */
export function notFound(message: string) {
  return new HttpError(404, "NOT_FOUND", message);
}
