import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { canhoesServerFetch } from "./canhoesServerClient";

vi.mock("next/headers", () => ({ cookies: async () => ({ toString: () => "session=abc" }) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn() } }));

const fetchMock = vi.fn<typeof fetch>();

describe("canhoesServerFetch", () => {
  beforeEach(() => vi.stubGlobal("fetch", fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    fetchMock.mockReset();
  });

  it("calls the local API with the request's cookies and returns the JSON", async () => {
    vi.stubEnv("CANHOES_INTERNAL_URL", "http://web:3000");
    fetchMock.mockResolvedValue(Response.json({ id: "event-1" }));

    await expect(canhoesServerFetch("/events/active/context")).resolves.toEqual({ id: "event-1" });
    expect(fetchMock).toHaveBeenCalledWith("http://web:3000/api/v1/events/active/context", {
      headers: { "Content-Type": "application/json", Cookie: "session=abc" },
      cache: "no-store",
    });
  });

  it("uses NEXTAUTH_URL or VERCEL_URL when CANHOES_INTERNAL_URL is unset", async () => {
    vi.stubEnv("NEXTAUTH_URL", "https://canhoes.app");
    fetchMock.mockResolvedValue(Response.json({ ok: true }));

    await canhoesServerFetch("status");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://canhoes.app/api/v1/status");

    vi.unstubAllEnvs();
    vi.stubEnv("VERCEL_URL", "preview.vercel.app");
    await canhoesServerFetch("status");
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://preview.vercel.app/api/v1/status");
  });

  it.each([401, 403, 500])("answers null on a %i", async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    await expect(canhoesServerFetch("events/x")).resolves.toBeNull();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3000/api/v1/events/x");
  });

  it("answers null when the API cannot be reached", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    await expect(canhoesServerFetch("events/x")).resolves.toBeNull();
  });
});
