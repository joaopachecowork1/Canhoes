import { http, HttpResponse, type JsonBodyType } from "msw";

type Method = "get" | "post" | "put" | "patch" | "delete";

/** A handler for `/api/v1/<path>` that answers `body` (default 200), as the route handlers do. */
export function apiRoute(method: Method, path: string, body: JsonBodyType = null, status = 200) {
  return http[method](`*/api/v1/${path}`, () =>
    status === 204 ? new HttpResponse(null, { status }) : HttpResponse.json(body, { status }),
  );
}

/** Records the requests a handler received, for asserting what the UI sent. */
export function recordRequests() {
  const requests: { method: string; url: string; body: unknown }[] = [];
  return {
    requests,
    async capture(request: Request) {
      const text = await request.clone().text();
      requests.push({
        method: request.method,
        url: new URL(request.url).pathname + new URL(request.url).search,
        body: text ? JSON.parse(text) : null,
      });
    },
  };
}
