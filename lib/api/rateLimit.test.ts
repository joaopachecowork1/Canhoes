import { afterEach, describe, expect, it, vi } from "vitest";

import { enforceAccountRateLimit, enforceRateLimit } from "./rateLimit";

const fromIp = (ip: string) => ({ headers: new Headers({ "x-forwarded-for": ip }) });

describe("enforceRateLimit", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("refuses the sixth strict request of the same IP in a window", () => {
    const caller = fromIp("caller-a");
    for (let call = 0; call < 5; call++) enforceRateLimit(caller, "strict");

    expect(() => enforceRateLimit(caller, "strict")).toThrowError(expect.objectContaining({ status: 429 }));
    expect(() => enforceRateLimit(fromIp("caller-b"), "strict")).not.toThrow();
  });

  it("trusts the address Cloudflare sets over a forwarded header the caller can fake", () => {
    vi.stubEnv("TRUST_CF_CONNECTING_IP", "true");
    const attacker = (spoofed: string) => ({
      headers: new Headers({ "cf-connecting-ip": "caller-real", "x-forwarded-for": spoofed }),
    });
    for (let call = 0; call < 5; call++) enforceRateLimit(attacker(`fake-${call}`), "strict");

    expect(() => enforceRateLimit(attacker("fake-new"), "strict")).toThrowError(
      expect.objectContaining({ status: 429 }),
    );
  });

  it("ignores CF-Connecting-IP unless the deployment says Cloudflare is the only way in", () => {
    const attacker = (spoofed: string) => ({
      headers: new Headers({ "cf-connecting-ip": spoofed, "x-forwarded-for": "caller-fixed" }),
    });
    for (let call = 0; call < 5; call++) enforceRateLimit(attacker(`fake-${call}`), "strict");

    expect(() => enforceRateLimit(attacker("fake-new"), "strict")).toThrowError(
      expect.objectContaining({ status: 429 }),
    );
  });

  it("does not limit callers it cannot tell apart", () => {
    const anonymous = { headers: new Headers() };

    expect(() => Array.from({ length: 30 }, () => enforceRateLimit(anonymous, "strict"))).not.toThrow();
  });

  it("does not let browser telemetry use up the budget of posts and likes", () => {
    const caller = fromIp("caller-telemetry");
    for (let call = 0; call < 20; call++) enforceRateLimit(caller, "telemetry");

    expect(() => enforceRateLimit(caller, "telemetry")).toThrowError(expect.objectContaining({ status: 429 }));
    expect(() => enforceRateLimit(caller, "standard")).not.toThrow();
  });

  it("counts each policy on its own", () => {
    const caller = fromIp("caller-c");
    for (let call = 0; call < 20; call++) enforceRateLimit(caller, "standard");

    expect(() => enforceRateLimit(caller, "standard")).toThrowError(expect.objectContaining({ status: 429 }));
    expect(() => enforceRateLimit(caller, "strict")).not.toThrow();
  });

  it("lets the caller back in when the window ends", () => {
    vi.useFakeTimers();
    const caller = fromIp("caller-d");
    for (let call = 0; call < 5; call++) enforceRateLimit(caller, "strict");

    vi.advanceTimersByTime(10_001);

    expect(() => enforceRateLimit(caller, "strict")).not.toThrow();
  });

  it("limits an account whatever the IP, ignoring the case of its email", () => {
    for (let call = 0; call < 10; call++)
      enforceAccountRateLimit(call % 2 ? "Dora@Example.test " : "dora@example.test", "login");

    expect(() => enforceAccountRateLimit("DORA@example.test", "login")).toThrowError(
      expect.objectContaining({ status: 429 }),
    );
    expect(() => enforceAccountRateLimit("eva@example.test", "login")).not.toThrow();
  });
});
