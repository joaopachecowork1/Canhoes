import { describe, expect, it, vi } from "vitest";
import { delay, http, HttpResponse } from "msw";

import { server } from "@/tests/component/server";

import { ApiError, canhoesFetch } from "./canhoesClient";

describe("canhoesFetch", () => {
  it("normalises the path to /api/<path> and parses JSON", async () => {
    server.use(http.get("*/api/v1/ping", () => HttpResponse.json({ ok: true })));
    await expect(canhoesFetch("/api/v1/ping")).resolves.toEqual({ ok: true });
    await expect(canhoesFetch("v1/ping")).resolves.toEqual({ ok: true });
  });

  it("returns undefined for 204 and the raw text for non-JSON bodies", async () => {
    server.use(
      http.delete("*/api/v1/item", () => new HttpResponse(null, { status: 204 })),
      http.get("*/api/v1/text", () => new HttpResponse("olá")),
    );
    await expect(canhoesFetch("v1/item", { method: "DELETE" })).resolves.toBeUndefined();
    await expect(canhoesFetch("v1/text")).resolves.toBe("olá");
  });

  it("rejects an empty path", async () => {
    await expect(canhoesFetch("/")).rejects.toMatchObject({ status: 400 });
  });

  it("turns errors into ApiError with the server's message and body", async () => {
    server.use(
      http.post("*/api/v1/fail", () => HttpResponse.json({ code: "X", message: "Nome em falta" }, { status: 422 })),
    );
    const error = await canhoesFetch("v1/fail", { method: "POST" }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 422, message: "Nome em falta", details: { code: "X" } });
  });

  it("returns null for a refused read unless asked to throw", async () => {
    server.use(http.get("*/api/v1/secret", () => new HttpResponse(null, { status: 403, statusText: "Forbidden" })));
    await expect(canhoesFetch("v1/secret")).resolves.toBeNull();
    await expect(canhoesFetch("v1/secret", { canhoes: { throwOnUnauthorized: true } })).rejects.toMatchObject({
      status: 403,
    });
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"])("never reports a refused %s as a success", async (method) => {
    server.use(http.all("*/api/v1/secret", () => new HttpResponse(null, { status: 401, statusText: "Unauthorized" })));
    await expect(canhoesFetch("v1/secret", { method })).rejects.toMatchObject({ status: 401 });
  });

  it("shares one request between identical GETs in flight", async () => {
    const handler = vi.fn(() => HttpResponse.json({ n: 1 }));
    server.use(http.get("*/api/v1/shared", handler));
    const [first, second] = await Promise.all([canhoesFetch("v1/shared"), canhoesFetch("v1/shared")]);
    expect(first).toEqual(second);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not share requests when asked to skip deduplication", async () => {
    const handler = vi.fn(() => HttpResponse.json({}));
    server.use(http.get("*/api/v1/fresh", handler));
    await Promise.all([
      canhoesFetch("v1/fresh", { canhoes: { skipDeduplication: true } }),
      canhoesFetch("v1/fresh", { canhoes: { skipDeduplication: true } }),
    ]);
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("gives up after 10 seconds with a 408", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    server.use(
      http.get("*/api/v1/slow", async () => {
        await delay("infinite");
        return HttpResponse.json({});
      }),
    );
    const pending = canhoesFetch("v1/slow").catch((caught: unknown) => caught);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(pending).resolves.toMatchObject({ status: 408 });
    vi.useRealTimers();
  });
});
