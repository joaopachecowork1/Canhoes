import { useState } from "react";

import type { StoryAuthorDto } from "@/lib/api/types";

import {
  findStoryPosition,
  nextStoryPosition,
  previousStoryPosition,
  storyAt,
  type StoryPosition,
} from "../rules/storyPlayback";

/** As stories sem as que já foram apagadas aqui, e sem os membros que ficam sem nenhuma. */
function withoutStories(groups: StoryAuthorDto[], removedIds: string[]) {
  return groups
    .map((group) => ({ ...group, stories: group.stories.filter((story) => !removedIds.includes(story.id)) }))
    .filter((group) => group.stories.length > 0);
}

/** O estado do visualizador: que story está no ecrã, pausa, carregamento da imagem e navegação (acaba com `onFinished`). */
export function useStoryPlayback({
  groups,
  startStoryId,
  onFinished,
}: Readonly<{ groups: StoryAuthorDto[]; startStoryId: string; onFinished: () => void }>) {
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [currentId, setCurrentId] = useState(startStoryId);
  const [isPaused, setIsPaused] = useState(false);
  // O resultado do carregamento da imagem atual: um só facto, não dois estados.
  const [loaded, setLoaded] = useState<{ id: string; failed: boolean } | null>(null);

  const visibleGroups = withoutStories(groups, removedIds);
  const position = findStoryPosition(visibleGroups, currentId);

  const goTo = (target: StoryPosition | null) => {
    const story = target && storyAt(visibleGroups, target);
    if (story) {
      // A imagem nova vai pedir-se de novo, mesmo que seja uma que já carregou antes.
      setLoaded(null);
      setCurrentId(story.id);
    } else onFinished();
  };

  const next = () => goTo(position && nextStoryPosition(visibleGroups, position));
  const previous = () => {
    const target = position && previousStoryPosition(visibleGroups, position);
    if (target) goTo(target);
  };

  /** Tira uma story da lista e, se era a que estava no ecrã, passa à seguinte (ou à anterior, se era a última). */
  const removeStory = (storyId: string) => {
    if (storyId === currentId && position) {
      goTo(nextStoryPosition(visibleGroups, position) ?? previousStoryPosition(visibleGroups, position));
    }
    setRemovedIds((ids) => [...ids, storyId]);
  };

  return {
    group: position ? visibleGroups[position.authorIndex] : undefined,
    story: position ? storyAt(visibleGroups, position) : undefined,
    position,
    isPaused,
    isLoaded: loaded?.id === currentId,
    hasFailed: loaded?.id === currentId && loaded.failed,
    togglePause: () => setIsPaused((paused) => !paused),
    markLoaded: () => setLoaded({ id: currentId, failed: false }),
    markFailed: () => setLoaded({ id: currentId, failed: true }),
    next,
    previous,
    removeStory,
  };
}
