import type { StoryAuthorDto, StoryDto } from "@/lib/api/types";

/** Onde o visualizador está: o membro e a story desse membro, ambos por índice. */
export type StoryPosition = { authorIndex: number; storyIndex: number };

/** Quanto tempo cada story fica no ecrã antes de passar à seguinte. */
export const STORY_DURATION_MS = 5000;

/** A story numa posição, ou nada se a posição já não existe. */
export function storyAt(groups: StoryAuthorDto[], { authorIndex, storyIndex }: StoryPosition): StoryDto | undefined {
  return groups[authorIndex]?.stories[storyIndex];
}

/** A posição de uma story pelo seu id, ou null se já não está na lista (expirou ou foi apagada). */
export function findStoryPosition(groups: StoryAuthorDto[], storyId: string): StoryPosition | null {
  for (const [authorIndex, group] of groups.entries()) {
    const storyIndex = group.stories.findIndex((story) => story.id === storyId);
    if (storyIndex >= 0) return { authorIndex, storyIndex };
  }
  return null;
}

/** A story seguinte (do mesmo membro e depois do membro seguinte), ou null depois da última. */
export function nextStoryPosition(groups: StoryAuthorDto[], { authorIndex, storyIndex }: StoryPosition) {
  if (storyIndex + 1 < (groups[authorIndex]?.stories.length ?? 0)) return { authorIndex, storyIndex: storyIndex + 1 };
  return authorIndex + 1 < groups.length ? { authorIndex: authorIndex + 1, storyIndex: 0 } : null;
}

/** A story anterior (do mesmo membro e depois a última do membro anterior), ou null antes da primeira. */
export function previousStoryPosition(groups: StoryAuthorDto[], { authorIndex, storyIndex }: StoryPosition) {
  if (storyIndex > 0) return { authorIndex, storyIndex: storyIndex - 1 };
  const previousAuthor = groups[authorIndex - 1];
  return previousAuthor ? { authorIndex: authorIndex - 1, storyIndex: previousAuthor.stories.length - 1 } : null;
}

/** A primeira story do membro seguinte, ou null depois do último membro. */
export function nextAuthorPosition(groups: StoryAuthorDto[], { authorIndex }: StoryPosition) {
  return authorIndex + 1 < groups.length ? { authorIndex: authorIndex + 1, storyIndex: 0 } : null;
}

/** A primeira story do membro anterior, ou null antes do primeiro membro. */
export function previousAuthorPosition(groups: StoryAuthorDto[], { authorIndex }: StoryPosition) {
  return groups[authorIndex - 1] ? { authorIndex: authorIndex - 1, storyIndex: 0 } : null;
}
