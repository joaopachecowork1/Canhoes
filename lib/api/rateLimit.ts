import { HttpError } from "@/lib/api/httpError";

// Janela fixa em memória, por IP e por política. Chega para uma só instância; reinicia com o servidor.
type RateLimitPolicy = "strict" | "standard" | "login" | "telemetry";

// Pedidos permitidos por janela de tempo, para cada política.
const POLICY_LIMITS: Record<RateLimitPolicy, { requests: number; windowMs: number }> = {
  strict: { requests: 5, windowMs: 10_000 },
  standard: { requests: 20, windowMs: 10_000 },
  login: { requests: 10, windowMs: 60_000 },
  // À parte de "standard": um ciclo de erros no browser não pode gastar os posts, comentários e gostos do mesmo utilizador.
  telemetry: { requests: 20, windowMs: 10_000 },
};

// Contador e fim da janela atual, por chave `política:ip` (ou `política:account:email`).
const requestCounts = new Map<string, { count: number; resetAt: number }>();

// shortcut: limpeza de entradas expiradas só quando o mapa é grande, passar para um armazenamento partilhado (Redis) se houver mais de uma instância.
const SWEEP_THRESHOLD = 5000;
const SWEEP_INTERVAL_MS = 60_000;
let nextSweepAt = 0;

// No máximo uma vez por minuto, para uma enxurrada de IPs novos não obrigar cada pedido a percorrer o mapa todo.
function sweepExpired(now: number) {
  if (requestCounts.size < SWEEP_THRESHOLD || now < nextSweepAt) return;
  nextSweepAt = now + SWEEP_INTERVAL_MS;
  for (const [key, record] of requestCounts) if (record.resetAt < now) requestCounts.delete(key);
}

/** Descobre o IP do cliente pelos cabeçalhos do proxy, ou "unknown" quando não há nenhum. */
function getClientIp(request: { headers: Headers }): string {
  // Atrás do túnel da Cloudflare este cabeçalho é posto pela própria Cloudflare; só se acredita com TRUST_CF_CONNECTING_IP=true.
  const cloudflareIp = process.env.TRUST_CF_CONNECTING_IP === "true" ? request.headers.get("cf-connecting-ip") : null;
  if (cloudflareIp) return cloudflareIp;

  // Na Vercel, x-vercel-forwarded-for é injetado com o IP de origem pelo edge da plataforma.
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) return vercelIp.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";

  return "unknown";
}

/** Conta um pedido em `key` e lança um 429 quando o limite da política se esgota na janela atual. */
function consume(key: string, policy: RateLimitPolicy) {
  const { requests, windowMs } = POLICY_LIMITS[policy];
  const now = Date.now();
  sweepExpired(now);

  const record = requestCounts.get(key);

  // Sem janela ativa: começa uma nova com este pedido.
  if (!record || record.resetAt < now) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }

  // Janela ativa e limite atingido: recusa.
  if (record.count >= requests) {
    throw new HttpError(429, "RATE_LIMIT_EXCEEDED", "Too many requests. Please slow down.");
  }
  record.count++;
}

/** Lança um 429 quando o IP de quem chama passou o limite da política na janela atual. */
export function enforceRateLimit(request: { headers: Headers }, policy: RateLimitPolicy) {
  const ip = getClientIp(request);
  // shortcut: without any proxy header (plain compose, local dev) callers cannot be told apart, so none is limited; behind the tunnel the header is always there.
  if (ip === "unknown") return;
  consume(`${policy}:${ip}`, policy);
}

/** Lança um 429 quando esta conta (um email) passou o limite da política; vale mesmo que cada pedido falsifique o IP. */
export function enforceAccountRateLimit(account: string, policy: RateLimitPolicy) {
  consume(`${policy}:account:${account.trim().toLowerCase()}`, policy);
}
