import type { StoryAuthorDto, StoryDto } from "@/lib/api/types";

import { StoryProgressBars } from "./StoryProgressBars";
import { StoryViewerHeader } from "./StoryViewerHeader";

const TOP_CLASS = "w-full max-w-md pt-[env(safe-area-inset-top)] transition-opacity";

/** Como o topo se mostra: esconde-se ao premir o ecrã e esbate-se (inerte) enquanto se apaga. */
function topClass(isHidden: boolean, isBusy: boolean) {
  if (isHidden) return `${TOP_CLASS} opacity-0`;
  return isBusy ? `${TOP_CLASS} opacity-50` : TOP_CLASS;
}

/** O topo do visualizador: as barras de progresso do membro e o cabeçalho com pausa, apagar e fechar. */
export function StoryViewerTop({
  group,
  story,
  storyIndex,
  isRunning,
  autoAdvance,
  isPaused,
  isHidden,
  isBusy,
  canDelete,
  onFinished,
  onTogglePause,
  onDelete,
  onClose,
}: Readonly<{
  group: StoryAuthorDto;
  story: StoryDto;
  storyIndex: number;
  isRunning: boolean;
  autoAdvance: boolean;
  isPaused: boolean;
  isHidden: boolean;
  isBusy: boolean;
  canDelete: boolean;
  onFinished: () => void;
  onTogglePause: () => void;
  onDelete: () => void;
  onClose: () => void;
}>) {
  return (
    <div className={topClass(isHidden, isBusy)} inert={isBusy}>
      <StoryProgressBars
        storyIds={group.stories.map(({ id }) => id)}
        currentIndex={storyIndex}
        isRunning={isRunning}
        autoAdvance={autoAdvance}
        onFinished={onFinished}
      />
      <StoryViewerHeader
        authorName={group.authorName}
        authorColor={group.authorColor}
        createdAtUtc={story.createdAtUtc}
        isPaused={isPaused}
        canDelete={canDelete}
        onTogglePause={onTogglePause}
        onDelete={onDelete}
        onClose={onClose}
      />
    </div>
  );
}
