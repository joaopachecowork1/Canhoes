import { absMediaUrl } from "@/lib/media";

/** Formata uma data na localização do navegador; devolve texto vazio se faltar ou for inválida. */
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

/** Todas as imagens de um post, sem repetições e por ordem; os posts antigos têm só um `mediaUrl`. */
export function getPostMediaUrls(post: { mediaUrls: string[]; mediaUrl: string | null }) {
  return [...new Set([...post.mediaUrls, post.mediaUrl])].filter((url): url is string => Boolean(url));
}
