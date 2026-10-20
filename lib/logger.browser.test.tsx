import { afterEach, describe, expect, it, vi } from "vitest";

// The environment is read when the module loads, so each test imports a fresh copy in the jsdom browser.
async function loadBrowserLogger(env: Record<string, string> = {}) {
  vi.resetModules();
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  return (await import("./logger")).logger;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("logger in the browser", () => {
  it("prints a prefixed line to the console", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = await loadBrowserLogger();

    logger.info("Carregado", { page: "mural" });

    expect(consoleLog).toHaveBeenCalledWith("[INFO] Carregado", { page: "mural" });
  });

  it("sends warnings and errors to the server log in production, but not plain info", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    const logger = await loadBrowserLogger({ NODE_ENV: "production" });

    logger.info("só consola");
    logger.warn("cuidado", { page: "mural" });
    logger.error("falhou", new Error("boom"));

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toMatchObject({ level: "warn", message: "cuidado", data: { page: "mural" } });
    expect(JSON.parse(String(fetchSpy.mock.calls[1]?.[1]?.body))).toMatchObject({ level: "error", data: { error: "boom" } });
  });

  it("does not report in development, and never fails when the report itself fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    await (await loadBrowserLogger({ NODE_ENV: "development" })).warn("local");
    expect(fetchSpy).not.toHaveBeenCalled();

    const production = await loadBrowserLogger({ NODE_ENV: "production" });
    expect(() => production.warn("sem rede")).not.toThrow();
  });

  it("hides what is below LOG_LEVEL", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = await loadBrowserLogger({ LOG_LEVEL: "warn" });

    logger.debug("ruído");
    logger.info("ruído");

    expect(consoleLog).not.toHaveBeenCalled();
  });
});
