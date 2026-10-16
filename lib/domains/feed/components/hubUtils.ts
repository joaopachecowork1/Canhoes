import { absMediaUrl } from "@/lib/media";

export function initials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts.at(-1)?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "";
  try {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

export { absMediaUrl };

/** Every image of a post once, in order; old posts keep a single `mediaUrl`. */
export function getPostMediaUrls(post: { mediaUrls: string[]; mediaUrl: string | null }) {
  return [...new Set([...post.mediaUrls, post.mediaUrl])].filter((url): url is string => Boolean(url));
}
