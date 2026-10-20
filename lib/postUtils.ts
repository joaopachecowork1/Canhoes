import { useEffect, useState } from "react";

/**
 * Parse post text into title and body (Reddit-style).
 *
 * If the text contains a newline, the first line becomes the title
 * and the rest becomes the body. Otherwise, the entire text is the body.
 */
export function parsePostText(text: string | undefined | null) {
  if (!text?.trim()) return { title: null, body: null };

  const lines = text.trim().split(/\r?\n/);
  const firstLine = lines[0]?.trim() ?? "";

  // If there's only one line, treat it all as body (no title)
  if (lines.length === 1) return { title: null, body: text.trim() };

  // First line is title, rest is body
  const body = lines.slice(1).join("\n").trim();
  return {
    title: firstLine,
    body: body || null,
  };
}

/**
 * Format relative time (Reddit-style: "2h", "3d", "1mo").
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
 * Hook that returns a live-updating relative time string.
 * Updates every 60 seconds.
 */
export function useRelativeTime(utcString: string): string {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  return formatRelativeTime(utcString);
}
