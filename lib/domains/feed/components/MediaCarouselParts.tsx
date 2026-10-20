"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { formatMessage } from "@/lib/messages";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { absMediaUrl } from "./hubUtils";

const copy = messages.feed.MediaCarousel;
const IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px";
export const MAX_HEIGHT_BY_ASPECT = {
  portrait: "max-h-[32rem]",
  video: "max-h-[28rem]",
  square: "max-h-[24rem]",
} as const;
const ARROW_CLASS =
  "absolute top-1/2 z-10 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-[var(--color-panel)]/50 p-1.5 text-[var(--text-primary)] opacity-0 shadow-lg transition group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35";

/** Aviso mostrado no lugar de uma imagem que falhou a carregar. */
function MediaFallback() {
  return (
    <div className="flex min-h-48 w-full flex-col items-center justify-center gap-2 bg-[var(--bg-deep)] px-4 text-center">
      <ImageOff className="h-5 w-5 text-[var(--text-muted)]" />
      <p className="text-sm font-medium text-[var(--text-muted)]">{copy.unavailable}</p>
      <p className="max-w-[18rem] text-xs text-[var(--text-muted)]/70">{copy.unavailableDetail}</p>
    </div>
  );
}

/** Uma imagem da galeria, ou o aviso de falha se não carregou. */
export function CarouselImage({
  alt,
  isEager,
  isFailed,
  isPriority,
  onClick,
  onError,
  url,
}: Readonly<{
  alt: string;
  isEager: boolean;
  isFailed: boolean;
  isPriority: boolean;
  onClick: () => void;
  onError: () => void;
  url: string;
}>) {
  if (isFailed) return <MediaFallback />;

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
      <Image
        src={absMediaUrl(url)}
        alt={alt}
        fill
        priority={isPriority}
        loading={isEager ? "eager" : "lazy"}
        decoding="async"
        sizes={IMAGE_SIZES}
        // um endereço que não é nosso (posts antigos, seed de demonstração) não está em next.config.mjs, por isso mostra-se tal como está
        unoptimized={!absMediaUrl(url).startsWith("/")}
        className="cursor-pointer object-contain transition-opacity hover:opacity-90"
        onError={onError}
        onClick={onClick}
      />
    </div>
  );
}

/** Setas anterior/seguinte e o contador "n / total" sobre a galeria. */
export function CarouselControls({
  currentIndex,
  onNext,
  onPrevious,
  total,
}: Readonly<{ currentIndex: number; onNext: () => void; onPrevious: () => void; total: number }>) {
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPrevious();
        }}
        aria-label={copy.previous}
        className={cn(ARROW_CLASS, "left-2")}
        disabled={currentIndex === 0}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onNext();
        }}
        aria-label={copy.next}
        className={cn(ARROW_CLASS, "right-2")}
        disabled={currentIndex === total - 1}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      <span
        className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-[var(--text-primary)]"
        aria-live="polite"
        aria-atomic="true"
      >
        {`${currentIndex + 1} / ${total}`}
      </span>
    </>
  );
}

/** Pontos por baixo da galeria; cada um salta para a imagem respetiva. */
export function CarouselDots({
  currentIndex,
  media,
  onSelect,
}: Readonly<{ currentIndex: number; media: string[]; onSelect: (index: number) => void }>) {
  return (
    <div className="flex items-center justify-center">
      {media.map((url, index) => (
        <button
          key={`dot-${url}-${index}`}
          type="button"
          aria-label={formatMessage(copy.goTo, { number: index + 1 })}
          aria-current={index === currentIndex ? "true" : undefined}
          className="group flex h-11 w-11 items-center justify-center"
          onClick={() => onSelect(index)}
        >
          <span
            className={cn(
              "h-1.5 w-6 rounded-full transition-[transform,background-color] duration-200",
              index === currentIndex
                ? "bg-[var(--moss-glow)]"
                : "scale-x-[0.34] bg-[var(--text-muted)]/30 group-hover:bg-[var(--text-muted)]/50",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** A faixa horizontal com todas as imagens, deslocada para mostrar a atual. */
export function CarouselTrack({
  currentIndex,
  failedMedia,
  isPriority,
  media,
  onError,
  onImageClick,
}: Readonly<{
  currentIndex: number;
  failedMedia: Record<string, boolean>;
  isPriority: boolean;
  media: string[];
  onError: (url: string) => void;
  onImageClick?: (index: number) => void;
}>) {
  return (
    <div
      className="flex h-full w-full transition-transform duration-200"
      style={{ transform: `translateX(-${currentIndex * 100}%)`, willChange: "transform" }}
    >
      {media.map((url, index) => (
        <div
          key={url}
          aria-hidden={index !== currentIndex}
          className="flex min-w-full items-center justify-center overflow-hidden"
        >
          <CarouselImage
            url={url}
            alt={formatMessage(copy.slideAlt, { number: index + 1, total: media.length })}
            isFailed={Boolean(failedMedia[url])}
            isPriority={isPriority && index === 0}
            // as vizinhas carregam cedo para um deslize nunca mostrar um espaço vazio
            isEager={(isPriority && index === 0) || Math.abs(index - currentIndex) === 1}
            onError={() => onError(url)}
            onClick={() => onImageClick?.(index)}
          />
        </div>
      ))}
    </div>
  );
}
