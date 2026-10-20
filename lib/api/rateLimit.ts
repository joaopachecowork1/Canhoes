import { HttpError } from "@/lib/api/httpError";

// In-memory, per-IP and per-policy fixed window. Good enough for a single instance; it resets on restart.
type RateLimitPolicy = "strict" | "standard" | "login" | "telemetry";

const POLICY_LIMITS: Record<RateLimitPolicy, { requests: number; windowMs: number }> = {
  strict: { requests: 5, windowMs: 10_000 },
  standard: { requests: 20, windowMs: 10_000 },
  login: { requests: 10, windowMs: 60_000 },
  // Apart from "standard": a browser error loop must not use up the same caller's posts, comments and likes.
  telemetry: { requests: 20, windowMs: 10_000 },
};

const requestCounts = new Map<string, { count: number; resetAt: number }>();

// shortcut: a sweep of expired entries only once the map is big, move to a shared store (Redis) if there is ever more than one instance.
const SWEEP_THRESHOLD = 5000;
const SWEEP_INTERVAL_MS = 60_000;
let nextSweepAt = 0;

// At most once a minute, so a flood of fresh IPs cannot make every request walk the whole map.
function sweepExpired(now: number) {
  if (requestCounts.size < SWEEP_THRESHOLD || now < nextSweepAt) return;
  nextSweepAt = now + SWEEP_INTERVAL_MS;
  for (const [key, record] of requestCounts) if (record.resetAt < now) requestCounts.delete(key);
}

function getClientIp(request: { headers: Headers }): string {
  // Behind the Cloudflare tunnel this header is set by Cloudflare itself; x-forwarded-for starts with whatever the caller sent.
  // Anywhere else any caller can send it, so it is only believed when TRUST_CF_CONNECTING_IP=true (compose.server.yml).
  const cloudflareIp = process.env.TRUST_CF_CONNECTING_IP === "true" ? request.headers.get("cf-connecting-ip") : null;
  if (cloudflareIp) return cloudflareIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** Counts one request under `key` and throws a 429 once the policy's limit is spent in the current window. */
function consume(key: string, policy: RateLimitPolicy) {
  const { requests, windowMs } = POLICY_LIMITS[policy];
  const now = Date.now();
  sweepExpired(now);

  const record = requestCounts.get(key);
  if (!record || record.resetAt < now) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (record.count >= requests) {
    throw new HttpError(429, "RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down.");
  }
  record.count++;
}

/** Throws a 429 when the caller's IP went over the policy's limit in the current window. */
export function enforceRateLimit(request: { headers: Headers }, policy: RateLimitPolicy) {
  const ip = getClientIp(request);
  // shortcut: without any proxy header (plain compose, local dev) callers cannot be told apart, so none is limited; behind the tunnel the header is always there.
  if (ip === "unknown") return;
  consume(`${policy}:${ip}`, policy);
}

/** Throws a 429 when this account (an email) went over the policy's limit; it holds even if every request fakes its IP. */
export function enforceAccountRateLimit(account: string, policy: RateLimitPolicy) {
  consume(`${policy}:account:${account.trim().toLowerCase()}`, policy);
}
