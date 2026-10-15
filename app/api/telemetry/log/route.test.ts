import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function postTelemetry(body: unknown) {
  const request = new NextRequest("http://localhost/api/telemetry/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({}) });
}

describe("POST /api/telemetry/log", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs browser errors with their details", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await postTelemetry({ level: "error", message: "Boom", data: { error: "TypeError" } });

    expect(response.status).toBe(204);
    expect(consoleError).toHaveBeenCalledWith(
      "[TELEMETRY ERROR] Boom",
      expect.objectContaining({ data: '{"error":"TypeError"}' })
    );
  });

  it("keeps a report on one log line", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await postTelemetry({ level: "info", message: "first\n[TELEMETRY ERROR] forged" });

    expect(consoleLog).toHaveBeenCalledWith("[TELEMETRY INFO] first [TELEMETRY ERROR] forged", expect.anything());
  });

  it("rejects unknown levels and oversized messages", async () => {
    expect((await postTelemetry({ level: "fatal", message: "x" })).status).toBe(400);
    expect((await postTelemetry({ level: "error", message: "x".repeat(501) })).status).toBe(400);
  });
});
