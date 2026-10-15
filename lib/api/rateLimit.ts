import { HttpError } from "@/lib/api/httpError";

// In-memory, per-IP fixed window. Good enough for a single instance; it resets on restart.
type RateLimitPolicy = "strict" | "standard";

const POLICY_LIMITS: Record<RateLimitPolicy, { requests: number; windowMs: number }> = {
  strict: { requests: 5, windowMs: 10_000 },
  standard: { requests: 20, windowMs: 10_000 },
};

const requestCountsByIp = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

/** Throws a 429 when the caller's IP went over the policy's limit in the current window. */
export function enforceRateLimit(request: Request, policy: RateLimitPolicy) {
  const { requests, windowMs } = POLICY_LIMITS[policy];
  const ip = getClientIp(request);
  const now = Date.now();

  const record = requestCountsByIp.get(ip);
  if (!record || record.resetAt < now) {
    requestCountsByIp.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  if (record.count >= requests) {
    throw new HttpError(429, "RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down.");
  }
  record.count++;
}
