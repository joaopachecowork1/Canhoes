import type { StoryAuthorDto } from "@/lib/api/types";
import { getMemberName } from "@/lib/memberName";

/** Quanto tempo vive uma story: 24 horas. */
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

/** Tamanho máximo da imagem de uma story: 4 MB, abaixo do limite de ~4,5 MB que a Vercel aceita num pedido. */
export const MAX_STORY_BYTES = 4 * 1024 * 1024;

/** Tamanho máximo do pedido inteiro: a imagem mais a folga do multipart. */
export const MAX_STORY_REQUEST_BYTES = MAX_STORY_BYTES + 64 * 1024;

/** Os formatos aceites nas stories (o GIF fica de fora). */
export const STORY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Quantas stories ativas um membro pode ter ao mesmo tempo num evento. */
export const MAX_ACTIVE_STORIES_PER_USER = 10;

// `stories/<eventId>/<ficheiro>`; só os formatos que o composer das stories aceita.
const STORY_FILE_PATTERN = /^[a-zA-Z0-9_-]+\.(jpg|png|webp)$/;
const SAFE_SEGMENT_PATTERN = /^[a-zA-Z0-9_-]+$/;

/** Devolve o instante em que uma story criada em `now` deixa de estar visível. */
export function computeStoryExpiry(now: Date): Date {
  return new Date(now.getTime() + STORY_LIFETIME_MS);
}

/** Diz se o membro já tem o máximo de stories ativas e não pode publicar mais. */
export function hasReachedStoryLimit(activeStoryCount: number): boolean {
  return activeStoryCount >= MAX_ACTIVE_STORIES_PER_USER;
}

/** O tamanho que o cabeçalho `content-length` declara, ou null se não veio ou não é um número inteiro. */
export function parseContentLength(header: string | null): number | null {
  return header !== null && /^\d+$/.test(header) ? Number(header) : null;
}

/** Diz se um pedido com este tamanho já passa o que a plataforma aceita, sem o ler. */
export function isStoryRequestTooLarge(requestBytes: number): boolean {
  return requestBytes > MAX_STORY_REQUEST_BYTES;
}

/** Confirma que a chave de armazenamento é `stories/<eventId>/<ficheiro>` desse evento, sem sair da pasta. */
export function isStoryKeyForEvent(key: string, eventId: string): boolean {
  if (!SAFE_SEGMENT_PATTERN.test(eventId)) return false;
  const [folder, keyEventId, fileName, ...rest] = key.split("/");
  return folder === "stories" && keyEventId === eventId && rest.length === 0 && STORY_FILE_PATTERN.test(fileName ?? "");
}

type StoryWithAuthor = {
  id: string;
  createdAtUtc: Date;
  expiresAtUtc: Date;
  author: { id: string; displayName: string | null; email: string; color: string };
};

/** Junta as stories por membro: as de cada um da mais antiga para a mais recente, e primeiro quem publicou há menos tempo. */
export function groupStoriesByAuthor(eventId: string, stories: StoryWithAuthor[]): StoryAuthorDto[] {
  const byAuthor = new Map<string, StoryAuthorDto & { newestAt: number }>();

  for (const story of [...stories].sort((a, b) => a.createdAtUtc.getTime() - b.createdAtUtc.getTime())) {
    const group = byAuthor.get(story.author.id) ?? {
      authorUserId: story.author.id,
      authorName: getMemberName(story.author),
      authorColor: story.author.color,
      stories: [],
      newestAt: 0,
    };
    group.stories.push({
      id: story.id,
      createdAtUtc: story.createdAtUtc.toISOString(),
      expiresAtUtc: story.expiresAtUtc.toISOString(),
      mediaUrl: `/api/v1/events/${eventId}/stories/${story.id}/media`,
    });
    group.newestAt = story.createdAtUtc.getTime();
    byAuthor.set(story.author.id, group);
  }

  return [...byAuthor.values()]
    .sort((a, b) => b.newestAt - a.newestAt)
    .map(({ newestAt: _newestAt, ...group }) => group);
}
