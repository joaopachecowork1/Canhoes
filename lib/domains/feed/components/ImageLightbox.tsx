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
const ROUND_BUTTON_CLASS = "rounded-full border border-white/10 bg-white/10 p-2 text-white hover:bg-white/20";
const ARROW_CLASS = cn("absolute top-1/2 z-10 -translate-y-1/2 shadow-lg", ROUND_BUTTON_CLASS);

type ImageLightboxProps = {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  authorName?: string;
  createdAtUtc?: string;
};

/** Index of the shown image, moved by arrows, keys and swipes, reset to `initialIndex` on open. */
function useLightboxNavigation({ initialIndex, isOpen, onClose, total }: Readonly<{ initialIndex: number; isOpen: boolean; onClose: () => void; total: number }>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < total - 1;
  const showPrevious = useCallback(() => setCurrentIndex((index) => Math.max(0, index - 1)), []);
  const showNext = useCallback(() => setCurrentIndex((index) => Math.min(total - 1, index + 1)), [total]);

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

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

  return { currentIndex, setCurrentIndex, canGoBack, canGoForward, showPrevious, showNext, handleKeyDown, handleTouchStart, handleTouchEnd };
}

function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLocked]);
}

function AuthorCaption({ authorName, createdAtUtc }: Readonly<{ authorName: string; createdAtUtc?: string }>) {
  return (
    <div className="absolute left-4 bottom-4 z-10 rounded-[var(--radius-md-token)] border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/75 backdrop-blur-sm">
      <span className="font-medium text-white/80">{authorName}</span>
      {createdAtUtc ? (
        <span className="ml-2">
          {new Date(createdAtUtc).toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ) : null}
    </div>
  );
}

function LightboxDots({ currentIndex, onSelect, total }: Readonly<{ currentIndex: number; onSelect: (index: number) => void; total: number }>) {
  return (
    <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5">
      {Array.from({ length: total }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect(index);
          }}
          className={cn("h-1.5 rounded-full transition-all", index === currentIndex ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60")}
          aria-label={formatMessage(messages.feed.MediaCarousel.goTo, { number: index + 1 })}
        />
      ))}
    </div>
  );
}

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

/** Full-screen viewer for a post's images. */
export function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
  authorName,
  createdAtUtc,
}: Readonly<ImageLightboxProps>) {
  const safeImages = images.filter(Boolean);
  const total = safeImages.length;
  const navigation = useLightboxNavigation({ initialIndex, isOpen: open, onClose, total });
  useBodyScrollLock(open);

  if (!open || total === 0) return null;

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
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      <button type="button" onClick={onClose} className={cn("absolute right-4 top-4 z-10", ROUND_BUTTON_CLASS)} aria-label={messages.common.close}>
        <X className="h-5 w-5" />
      </button>

      {hasSeveral ? (
        <div className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-medium text-white" aria-live="polite">
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
          alt={authorName ? formatMessage(messages.feed.MediaCarousel.authorImageAlt, { name: authorName }) : copy.imageAlt}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          draggable={false}
          width={1200}
          height={900}
          style={{ width: "auto", height: "auto" }}
          unoptimized
        />
      </div>

      {navigation.canGoForward ? <LightboxArrow direction="next" onClick={navigation.showNext} /> : null}

      {hasSeveral ? <LightboxDots currentIndex={navigation.currentIndex} onSelect={navigation.setCurrentIndex} total={total} /> : null}
    </div>,
    document.body
  );
}
