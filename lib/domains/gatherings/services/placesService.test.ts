import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getStaticMapUrl, searchPlaces } from "./placesService";

describe("placesService", () => {
  const originalKey = process.env.GOOGLE_MAPS_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env.GOOGLE_MAPS_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("returns an empty array when query is too short", async () => {
    const results = await searchPlaces("a");
    expect(results).toEqual([]);
  });

  it("returns an empty array when GOOGLE_MAPS_API_KEY is missing", async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const results = await searchPlaces("Ramiro");
    expect(results).toEqual([]);
  });

  it("parses and formats Google Places responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        places: [
          {
            id: "place-1",
            displayName: { text: "Cervejaria Ramiro" },
            formattedAddress: "Av. Almirante Reis 1, Lisboa",
            location: { latitude: 38.72, longitude: -9.13 },
            googleMapsUri: "https://maps.google.com/?cid=123",
          },
        ],
      }),
    } as Response);

    const results = await searchPlaces("Ramiro");
    expect(results).toEqual([
      {
        id: "place-1",
        name: "Cervejaria Ramiro",
        address: "Av. Almirante Reis 1, Lisboa",
        latitude: 38.72,
        longitude: -9.13,
        mapUrl: "https://maps.google.com/?cid=123",
      },
    ]);
  });

  it("handles fetch errors gracefully without throwing", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network timeout"));

    const results = await searchPlaces("Ramiro");
    expect(results).toEqual([]);
  });

  it("builds a dark-themed static map URL", () => {
    const url = getStaticMapUrl(38.72, -9.13);
    expect(url).toContain("https://maps.googleapis.com/maps/api/staticmap");
    expect(url).toContain("center=38.72%2C-9.13");
    expect(url).toContain("key=test-api-key");
    expect(url).toContain("style=");
  });

  it("returns null for static map URL if API key is missing", () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const url = getStaticMapUrl(38.72, -9.13);
    expect(url).toBeNull();
  });
});
