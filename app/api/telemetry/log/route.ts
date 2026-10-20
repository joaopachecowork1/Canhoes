import { enforceRateLimit } from "@/lib/api/rateLimit";
import { z } from "zod";

import { apiRoute, noContent, readJson } from "@/lib/api/route";
import { logger } from "@/lib/logger";

// Pública de propósito (os erros também acontecem antes do login), por isso todos os campos têm limite.
const MAX_DATA_LENGTH = 2000;

// Uma linha de log por relatório: uma mudança de linha na mensagem não pode forjar outra entrada.
const singleLine = (text: string) => text.replace(/[\r\n]+/g, " ");

const telemetrySchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().max(500).transform(singleLine),
  data: z.unknown().optional(),
  url: z.string().max(500).optional(),
  timestamp: z.string().max(50).optional(),
});

/** POST /telemetry/log: regista no servidor uma entrada de log enviada pelo browser */
export const POST = apiRoute(async (request) => {
  // Limita o ritmo de pedidos por cliente.
  enforceRateLimit(request, "telemetry");

  // Valida o corpo do pedido.
  const { level, message, data, url, timestamp } = await readJson(request, telemetrySchema);

  // Regista a entrada no log do servidor.
  const context = { url, browserTime: timestamp, data: JSON.stringify(data)?.slice(0, MAX_DATA_LENGTH) };
  const line = `Browser: ${message}`;

  // `logger.error` recebe o erro em segundo lugar; os outros níveis só mensagem e contexto.
  if (level === "error") logger.error(line, undefined, context);
  else logger[level](line, context);

  return noContent();
});
