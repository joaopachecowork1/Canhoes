import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET as getMap } from "@/app/api/v1/events/[eventId]/places/map/route";

import { createEvent, createMember, randomIp, signInAs } from "./helpers";

/** Pede o mapa como o browser: um GET com as coordenadas na query. */
async function requestMap(eventId: string, query: string) {
  return getMap(new NextRequest(`http://localhost/api/test${query}`, { headers: { "x-forwarded-for": randomIp() } }), {
    params: Promise.resolve({ eventId }),
  });
}

let eventId = "";
beforeEach(async () => {
  const event = await createEvent();
  eventId = event.id;
  signInAs(await createMember(event.id));
  vi.stubEnv("GOOGLE_MAPS_API_KEY", "test-key");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("the static map of a place", () => {
  it.each([
    ["no coordinates at all", ""],
    ["a missing longitude", "?lat=38.7"],
    ["coordinates that are not numbers", "?lat=abc&lng=def"],
    ["a latitude beyond the poles", "?lat=91&lng=0"],
    ["a longitude beyond the date line", "?lat=0&lng=181"],
  ])("answers 400 for %s, without calling Google", async (_label, query) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect((await requestMap(eventId, query)).status).toBe(400);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("answers 404 when there is no Maps key configured", async () => {
    vi.stubEnv("GOOGLE_MAPS_API_KEY", "");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect((await requestMap(eventId, "?lat=38.7&lng=-9.1")).status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("proxies the image and lets it be cached for a day", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(Uint8Array.from([1, 2, 3]), { headers: { "Content-Type": "image/jpeg" } }));

    const response = await requestMap(eventId, "?lat=38.7&lng=-9.1");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toContain("max-age=86400");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("center=38.7%2C-9.1");
    expect(String(fetchSpy.mock.calls[0]?.[0])).toContain("key=test-key");
    expect(JSON.stringify([...response.headers])).not.toContain("test-key");
  });

  it("assumes a png when Google does not say what it sent", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(Uint8Array.from([1])));

    expect((await requestMap(eventId, "?lat=0&lng=0")).headers.get("content-type")).toBe("image/png");
  });

  it("passes on Google's own refusal", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 403 }));

    expect((await requestMap(eventId, "?lat=38.7&lng=-9.1")).status).toBe(403);
  });

  it("answers 502 when Google cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    expect((await requestMap(eventId, "?lat=38.7&lng=-9.1")).status).toBe(502);
  });

  it("stops a client that asks for maps over and over, since each one is a paid call to Google", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(Uint8Array.from([1])));
    const sameClient = "203.0.113.7";
    const ask = () =>
      getMap(
        new NextRequest("http://localhost/api/test?lat=38.7&lng=-9.1", { headers: { "x-forwarded-for": sameClient } }),
        { params: Promise.resolve({ eventId }) },
      );

    const statuses = [];
    for (let attempt = 0; attempt < 25; attempt++) statuses.push((await ask()).status);

    expect(statuses.filter((status) => status === 429).length).toBeGreaterThan(0);
    expect(fetchSpy.mock.calls.length).toBeLessThan(25);
  });
});
