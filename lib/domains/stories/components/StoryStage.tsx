import type { PointerEventHandler, ReactNode } from "react";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.stories.StoryViewer;
// O contorno fica por dentro: as zonas ocupam o palco todo e um contorno por fora seria cortado nas margens do ecrã.
const TAP_ZONE_CLASS =
  "absolute inset-y-0 focus-visible:-outline-offset-2 focus-visible:outline-2 focus-visible:outline-[var(--text-primary)]";

/** A imagem da story e as duas zonas de toque (anterior à esquerda, seguinte à direita); `children` fica por cima. Recebe os gestos de toque. */
export function StoryStage({
  storyId,
  mediaUrl,
  authorName,
  isLoaded,
  hasFailed,
  isBusy,
  onLoad,
  onError,
  onPrevious,
  onNext,
  gestureHandlers,
  children,
}: Readonly<{
  storyId: string;
  mediaUrl: string;
  authorName: string;
  isLoaded: boolean;
  hasFailed: boolean;
  isBusy: boolean;
  onLoad: () => void;
  onError: () => void;
  onPrevious: () => void;
  onNext: () => void;
  gestureHandlers: {
    onPointerDown: PointerEventHandler;
    onPointerMove: PointerEventHandler;
    onPointerUp: PointerEventHandler;
    onPointerCancel: PointerEventHandler;
  };
  children?: ReactNode;
}>) {
  return (
    <div className="relative min-h-0 w-full max-w-md flex-1 touch-none select-none" {...gestureHandlers}>
      {/* eslint-disable-next-line @next/next/no-img-element -- a imagem vem de uma rota autenticada e sem cache: o otimizador do Next não leva a sessão */}
      <img
        key={storyId}
        src={mediaUrl}
        alt={formatMessage(copy.imageAlt, { name: authorName })}
        className="absolute inset-0 size-full object-contain"
        decoding="async"
        onLoad={onLoad}
        onError={onError}
      />
      {isLoaded || hasFailed ? null : <div aria-hidden="true" className="skeleton-shimmer absolute inset-0" />}
      {hasFailed ? (
        <p
          role="status"
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-base text-[var(--text-primary)]"
        >
          {copy.imageError}
        </p>
      ) : null}
      <button
        type="button"
        aria-label={copy.previous}
        className={`${TAP_ZONE_CLASS} left-0 w-1/3`}
        onClick={onPrevious}
      />
      <button
        type="button"
        aria-label={copy.next}
        tabIndex={isBusy ? -1 : 0}
        className={`${TAP_ZONE_CLASS} right-0 w-2/3`}
        onClick={onNext}
      />
      {children}
    </div>
  );
}
