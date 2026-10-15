import { afterEach, describe, expect, it, vi } from "vitest";

// The level is read when the module loads, so each test imports a fresh copy.
async function loadLogger(logLevel?: string) {
  vi.resetModules();
  if (logLevel !== undefined) vi.stubEnv("LOG_LEVEL", logLevel);
  return (await import("./logger")).logger;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger on the server", () => {
  it("writes one line with the time, the level, the message and the context as JSON", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = await loadLogger("debug");

    logger.info("Seed done", { admins: 2 });

    expect(consoleLog).toHaveBeenCalledOnce();
    expect(consoleLog.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\S+Z INFO Seed done \{"admins":2\}$/);
  });

  it("logs an Error's message and stack, not an empty object", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const logger = await loadLogger();

    logger.error("Upload failed", new Error("disk full"), { postId: "p1" });

    const line = String(consoleError.mock.calls[0][0]);
    expect(line).toContain("ERROR Upload failed");
    expect(line).toContain('"postId":"p1"');
    expect(line).toContain('"error":"disk full"');
    expect(line).toContain('"stack":"Error: disk full');
  });

  it("skips entries below LOG_LEVEL", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = await loadLogger("warn");

    logger.debug("hidden");
    logger.info("hidden");
    logger.warn("shown");

    expect(consoleLog).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledOnce();
  });
});
