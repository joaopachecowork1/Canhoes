"use client";

import type { KeyboardEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";

import type { StoryAuthorDto } from "@/lib/api/types";

import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import { useStoryDeletion } from "../hooks/useStoryDeletion";
import { useStoryGestures } from "../hooks/useStoryGestures";
import { useStoryPlayback } from "../hooks/useStoryPlayback";
import { StoryAnnouncements } from "./StoryAnnouncements";
import { StoryDeleteConfirm } from "./StoryDeleteConfirm";
import { StoryStage } from "./StoryStage";
import { StoryViewerTop } from "./StoryViewerTop";

// O ecrã acompanha o dedo sem atraso; ao largar volta ao sítio com uma transição curta (só transform).
const CONTENT_CLASS =
  "fixed inset-0 z-[100] flex flex-col items-center bg-[var(--color-panel)] pb-[env(safe-area-inset-bottom)] outline-none";

/** Classe e estilo do ecrã: acompanha o dedo enquanto se arrasta e, ao largar, volta ao sítio. */
function dragProps(dragOffset: number) {
  if (dragOffset) return { className: CONTENT_CLASS, style: { transform: `translateY(${dragOffset}px)` } };
  return { className: `${CONTENT_CLASS} transition-transform duration-150 motion-reduce:transition-none` };
}

/** As setas do teclado mudam de story, exceto enquanto se confirma o apagar. */
function arrowKeys(isBusy: boolean, { next, previous }: Readonly<{ next: () => void; previous: () => void }>) {
  return (event: KeyboardEvent) => {
    if (isBusy) return;
    if (event.key === "ArrowRight") next();
    else if (event.key === "ArrowLeft") previous();
  };
}

/** As stories em ecrã inteiro: avançam sozinhas (se não houver pedido de menos movimento), com toque, setas, pausa e os gestos do telemóvel (premir, deslizar). */
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
  const gestures = useStoryGestures({
    isDisabled: deletion.isBusy,
    onClose,
    onNextAuthor: playback.nextAuthor,
    onPreviousAuthor: playback.previousAuthor,
  });
  const { group, story, position } = playback;
  if (!group || !story || !position) return null;

  const canDelete = isAdmin || group.authorUserId === currentUserId;
  const isRunning =
    playback.isLoaded && !playback.hasFailed && !playback.isPaused && !gestures.isHolding && !deletion.isBusy;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          {...dragProps(gestures.dragOffset)}
          onKeyDown={arrowKeys(deletion.isBusy, playback)}
          onEscapeKeyDown={deletion.interceptEscape}
        >
          <StoryAnnouncements
            authorName={group.authorName}
            current={position.storyIndex + 1}
            total={group.stories.length}
          />
          <StoryViewerTop
            group={group}
            story={story}
            storyIndex={position.storyIndex}
            isRunning={isRunning}
            autoAdvance={!prefersReducedMotion}
            isPaused={playback.isPaused}
            isHidden={gestures.isHolding}
            isBusy={deletion.isBusy}
            canDelete={canDelete}
            onFinished={playback.next}
            onTogglePause={playback.togglePause}
            onDelete={() => deletion.ask(story.id)}
            onClose={onClose}
          />
          <StoryStage
            storyId={story.id}
            mediaUrl={story.mediaUrl}
            authorName={group.authorName}
            isLoaded={playback.isLoaded}
            hasFailed={playback.hasFailed}
            onLoad={playback.markLoaded}
            onError={playback.markFailed}
            isBusy={deletion.isBusy}
            onPrevious={deletion.unlessBusy(gestures.unlessGesture(playback.previous))}
            onNext={deletion.unlessBusy(gestures.unlessGesture(playback.next))}
            gestureHandlers={gestures.handlers}
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
