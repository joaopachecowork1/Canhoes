import { useEffect, useState } from "react";

/**
 * Divide o texto de uma publicação em título e corpo (ao estilo Reddit).
 *
 * Se o texto tiver uma mudança de linha, a primeira linha é o título
 * e o resto é o corpo. Caso contrário, o texto todo é o corpo.
 */
export function parsePostText(text: string | undefined | null) {
  if (!text?.trim()) return { title: null, body: null };

  const lines = text.trim().split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";

  // Com uma só linha, é tudo corpo (sem título)
  if (lines.length === 1) return { title: null, body: text.trim() };

  // A primeira linha é o título, o resto é o corpo
  const body = lines.slice(1).join("\n").trim();
  return {
    title: firstLine,
    body: body || null,
  };
}

/**
 * Formata o tempo relativo ao estilo Reddit ("2h", "3d", "1mo").
 */
function formatRelativeTime(utcString: string): string {
  const then = new Date(utcString).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "agora";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}min`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d`;
  if (diffSec < 31536000) return `${Math.floor(diffSec / 2592000)}mo`;
  return `${Math.floor(diffSec / 31536000)}a`;
}

/**
 * Devolve o tempo relativo de uma data, atualizado a cada 60 segundos.
 */
export function useRelativeTime(utcString: string): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  return formatRelativeTime(utcString);
}
