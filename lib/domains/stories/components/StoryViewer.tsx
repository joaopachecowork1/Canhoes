"use client";

import type { KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import type { StoryAuthorDto } from "@/lib/api/types";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useStoryDeletion } from "../hooks/useStoryDeletion";
import { useStoryPlayback } from "../hooks/useStoryPlayback";
import { StoryAnnouncements } from "./StoryAnnouncements";
import { StoryDeleteConfirm } from "./StoryDeleteConfirm";
import { StoryProgressBars } from "./StoryProgressBars";
import { StoryStage } from "./StoryStage";
import { StoryViewerHeader } from "./StoryViewerHeader";

// O cabeçalho esbate enquanto se apaga (fica inerte).
const HEADER_CLASS = "w-full max-w-md pt-[env(safe-area-inset-top)] transition-opacity";

/** As stories em ecrã inteiro: avançam sozinhas (se não houver pedido de menos movimento), com toque, setas e pausa. */
export function StoryViewer({
  groups,
  startStoryId,
  currentUserId,
  isAdmin,
  onClose,
  onDelete,
}: Readonly<{
  groups: StoryAuthorDto[];
  startStoryId: string;
  currentUserId: string | null;
  isAdmin: boolean;
  onClose: () => void;
  onDelete: (storyId: string) => Promise<boolean>;
}>) {
  const playback = useStoryPlayback({ groups, startStoryId, onFinished: onClose });
  const prefersReducedMotion = usePrefersReducedMotion();
  const deletion = useStoryDeletion({ onDelete, onDeleted: playback.removeStory });
  const { group, story, position } = playback;
  if (!group || !story || !position) return null;

  const canDelete = isAdmin || group.authorUserId === currentUserId;

  const handleKeyDown = (event: KeyboardEvent) => {
    if (deletion.isBusy) return;
    if (event.key === "ArrowRight") playback.next();
    else if (event.key === "ArrowLeft") playback.previous();
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[100] flex flex-col items-center bg-[var(--color-panel)] pb-[env(safe-area-inset-bottom)] outline-none"
          onKeyDown={handleKeyDown}
          onEscapeKeyDown={deletion.interceptEscape}
        >
          <StoryAnnouncements
            authorName={group.authorName}
            current={position.storyIndex + 1}
            total={group.stories.length}
          />
          <div className={deletion.isBusy ? `${HEADER_CLASS} opacity-50` : HEADER_CLASS} inert={deletion.isBusy}>
            <StoryProgressBars
              storyIds={group.stories.map(({ id }) => id)}
              currentIndex={position.storyIndex}
              isRunning={playback.isLoaded && !playback.hasFailed && !playback.isPaused && !deletion.isBusy}
              autoAdvance={!prefersReducedMotion}
              onFinished={playback.next}
            />
            <StoryViewerHeader
              authorName={group.authorName}
              authorColor={group.authorColor}
              createdAtUtc={story.createdAtUtc}
              isPaused={playback.isPaused}
              canDelete={canDelete}
              onTogglePause={playback.togglePause}
              onDelete={() => deletion.ask(story.id)}
              onClose={onClose}
            />
          </div>
          <StoryStage
            storyId={story.id}
            mediaUrl={story.mediaUrl}
            authorName={group.authorName}
            isLoaded={playback.isLoaded}
            hasFailed={playback.hasFailed}
            onLoad={playback.markLoaded}
            onError={playback.markFailed}
            isBusy={deletion.isBusy}
            onPrevious={deletion.unlessBusy(playback.previous)}
            onNext={deletion.unlessBusy(playback.next)}
          >
            {deletion.confirmingId ? (
              <StoryDeleteConfirm onCancel={deletion.cancel} onConfirm={deletion.confirm} />
            ) : null}
          </StoryStage>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
