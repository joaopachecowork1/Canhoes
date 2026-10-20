"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { formatMessage } from "@/lib/messages";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.feed.ImageLightbox;
const SWIPE_THRESHOLD_PX = 50;
const ROUND_BUTTON_CLASS =
  "rounded-full border border-[var(--color-veil)]/10 bg-[var(--color-veil)]/10 p-2 text-[var(--text-primary)] hover:bg-[var(--color-veil)]/20";
const ARROW_CLASS = cn("absolute top-1/2 z-10 -translate-y-1/2 shadow-lg", ROUND_BUTTON_CLASS);

type ImageLightboxProps = {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  authorName?: string;
  createdAtUtc?: string;
};

/** Índice da imagem mostrada, movido por setas, teclas e gestos de deslize; começa em `initialIndex`. */
function useLightboxNavigation({
  initialIndex,
  onClose,
  total,
}: Readonly<{ initialIndex: number; onClose: () => void; total: number }>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < total - 1;
  const showPrevious = useCallback(() => setCurrentIndex((index) => Math.max(0, index - 1)), []);
  const showNext = useCallback(() => setCurrentIndex((index) => Math.min(total - 1, index + 1)), [total]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") onClose();
    else if (event.key === "ArrowLeft" && canGoBack) showPrevious();
    else if (event.key === "ArrowRight" && canGoForward) showNext();
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -SWIPE_THRESHOLD_PX && canGoForward) showNext();
    else if (deltaX > SWIPE_THRESHOLD_PX && canGoBack) showPrevious();
  };

  return {
    currentIndex,
    setCurrentIndex,
    canGoBack,
    canGoForward,
    showPrevious,
    showNext,
    handleKeyDown,
    handleTouchStart,
    handleTouchEnd,
  };
}

/** Bloqueia o scroll da página enquanto o visualizador está aberto e repõe-no ao fechar. */
function useBodyScrollLock() {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
}

/** Legenda com o autor e a data, no canto do visualizador. */
function AuthorCaption({ authorName, createdAtUtc }: Readonly<{ authorName: string; createdAtUtc?: string }>) {
  return (
    <div className="absolute left-4 bottom-4 z-10 rounded-[var(--radius-md-token)] border border-[var(--color-veil)]/10 bg-black/35 px-3 py-2 text-xs text-[var(--text-secondary)] backdrop-blur-sm">
      <span className="font-medium text-[var(--text-secondary)]">{authorName}</span>
      {createdAtUtc ? (
        <span className="ml-2">
          {new Date(createdAtUtc).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ) : null}
    </div>
  );
}

/** Pontos de navegação; cada um salta para a imagem respetiva. */
function LightboxDots({
  currentIndex,
  onSelect,
  total,
}: Readonly<{ currentIndex: number; onSelect: (index: number) => void; total: number }>) {
  return (
    <div className="absolute bottom-14 left-1/2 z-10 -translate-x-1/2 flex items-center">
      {Array.from({ length: total }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={(event) => {
            // evita que o clique chegue ao fundo, que fecha o visualizador
            event.stopPropagation();
            onSelect(index);
          }}
          className="group flex h-11 w-11 items-center justify-center"
          aria-label={formatMessage(messages.feed.MediaCarousel.goTo, { number: index + 1 })}
          aria-current={index === currentIndex ? "true" : undefined}
        >
          <span
            className={cn(
              "h-1.5 w-6 rounded-full transition-[transform,background-color] duration-200",
              index === currentIndex
                ? "bg-[var(--text-primary)]"
                : "scale-x-[0.34] bg-[var(--text-primary)]/40 group-hover:bg-[var(--text-primary)]/60",
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Seta para a imagem anterior ou seguinte. */
function LightboxArrow({ direction, onClick }: Readonly<{ direction: "previous" | "next"; onClick: () => void }>) {
  const isPrevious = direction === "previous";
  const Icon = isPrevious ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={cn(ARROW_CLASS, isPrevious ? "left-2" : "right-2")}
      aria-label={isPrevious ? messages.feed.MediaCarousel.previous : messages.feed.MediaCarousel.next}
    >
      <Icon className="h-6 w-6" />
    </button>
  );
}

/** Visualizador de ecrã inteiro das imagens de um post; só é montado enquanto aberto, para cada abertura começar de novo. */
export function ImageLightbox({ images, open, ...dialogProps }: Readonly<ImageLightboxProps>) {
  const safeImages = images.filter(Boolean);
  if (!open || safeImages.length === 0) return null;
  return <LightboxDialog images={safeImages} {...dialogProps} />;
}

/** O diálogo em si, renderizado num portal sobre o `body`. */
function LightboxDialog({
  images: safeImages,
  initialIndex,
  onClose,
  authorName,
  createdAtUtc,
}: Readonly<Omit<ImageLightboxProps, "open">>) {
  const total = safeImages.length;
  const navigation = useLightboxNavigation({ initialIndex, onClose, total });
  useBodyScrollLock();

  const currentImageUrl = safeImages[navigation.currentIndex] ?? safeImages[0];
  const hasSeveral = total > 1;

  return createPortal(
    <div
      className="animate-fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-overlay)] backdrop-blur-[10px]"
      onKeyDown={navigation.handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label={copy.dialogLabel}
      tabIndex={-1}
    >
      {/* o fundo clicável fecha o visualizador */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <button
        type="button"
        onClick={onClose}
        className={cn("absolute right-4 top-4 z-10", ROUND_BUTTON_CLASS)}
        aria-label={messages.common.close}
      >
        <X className="h-5 w-5" />
      </button>

      {hasSeveral ? (
        <div
          className="absolute left-4 top-4 z-10 rounded-full border border-[var(--color-veil)]/10 bg-black/50 px-3 py-1 text-xs font-medium text-[var(--text-primary)]"
          aria-live="polite"
        >
          {`${navigation.currentIndex + 1} / ${total}`}
        </div>
      ) : null}

      {authorName ? <AuthorCaption authorName={authorName} createdAtUtc={createdAtUtc} /> : null}

      {navigation.canGoBack ? <LightboxArrow direction="previous" onClick={navigation.showPrevious} /> : null}

      <div
        className="relative z-[1] mx-4 my-auto max-h-[90vh] max-w-[90vw] touch-pan-x"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={navigation.handleTouchStart}
        onTouchEnd={navigation.handleTouchEnd}
      >
        <Image
          src={currentImageUrl}
          alt={
            authorName ? formatMessage(messages.feed.MediaCarousel.authorImageAlt, { name: authorName }) : copy.imageAlt
          }
          className="max-h-[90vh] max-w-[90vw] object-contain"
          draggable={false}
          width={1200}
          height={900}
          style={{ width: "auto", height: "auto" }}
          unoptimized
        />
      </div>

      {navigation.canGoForward ? <LightboxArrow direction="next" onClick={navigation.showNext} /> : null}

      {hasSeveral ? (
        <LightboxDots currentIndex={navigation.currentIndex} onSelect={navigation.setCurrentIndex} total={total} />
      ) : null}
    </div>,
    document.body,
  );
}
