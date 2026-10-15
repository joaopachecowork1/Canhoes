import { z } from "zod";

import { apiRoute, noContent, readJson } from "@/lib/api/route";

// Public on purpose (errors happen before login too), so every field is bounded.
const MAX_DATA_LENGTH = 2000;

// One log line per report: a newline in the message must not forge another entry.
const singleLine = (text: string) => text.replace(/[\r\n]+/g, " ");

const telemetrySchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]),
  message: z.string().max(500).transform(singleLine),
  data: z.unknown().optional(),
  url: z.string().max(500).optional(),
  timestamp: z.string().max(50).optional(),
});

export const POST = apiRoute(async (request) => {
  const { level, message, data, url, timestamp } = await readJson(request, telemetrySchema);
  const details = { url, timestamp, data: JSON.stringify(data)?.slice(0, MAX_DATA_LENGTH) };
  const line = `[TELEMETRY ${level.toUpperCase()}] ${message}`;

  if (level === "error") console.error(line, details);
  else if (level === "warn") console.warn(line, details);
  else console.log(line, details);

  return noContent();
});
