"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { feedCopy } from "@/lib/canhoesCopy";
import { cn } from "@/lib/utils";

import { absMediaUrl } from "./hubUtils";

function useCarouselGesture(totalSlides: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0].clientX;
    touchStartY.current = event.touches[0].clientY;
    isDragging.current = false;
  };

  const handleTouchMove = (event: TouchEvent) => {
    const deltaX = Math.abs(event.touches[0].clientX - touchStartX.current);
    const deltaY = Math.abs(event.touches[0].clientY - touchStartY.current);

    if (deltaX > deltaY && deltaX > 10) {
      isDragging.current = true;
    }
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (!isDragging.current) return;

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    const threshold = 50;

    if (deltaX < -threshold && currentIndex < totalSlides - 1) {
      setCurrentIndex((previousIndex) => previousIndex + 1);
    } else if (deltaX > threshold && currentIndex > 0) {
      setCurrentIndex((previousIndex) => previousIndex - 1);
    }

    isDragging.current = false;
  };

  return {
    currentIndex,
    handleTouchEnd,
    handleTouchMove,
    handleTouchStart,
    setCurrentIndex,
  };
}

export type MediaCarouselProps = {
  urls: string[];
  className?: string;
  aspect?: "square" | "portrait" | "video";
  onImageClick?: (index: number) => void;
  authorName?: string;
  isPriority?: boolean;
};

export function MediaCarousel({
  urls,
  className,
  aspect = "square",
  onImageClick,
  authorName,
  isPriority = false,
}: Readonly<MediaCarouselProps>) {
  const media = (urls ?? []).filter(Boolean);
  const [failedMedia, setFailedMedia] = useState<Record<string, boolean>>({});
  const { currentIndex, setCurrentIndex, handleTouchEnd, handleTouchMove, handleTouchStart } =
    useCarouselGesture(media.length);

  useEffect(() => {
    setCurrentIndex((previousIndex) =>
      Math.min(previousIndex, Math.max(media.length - 1, 0))
    );
  }, [media.length, setCurrentIndex]);

  const markAsFailed = useCallback((url: string) => {
    setFailedMedia((previousState) =>
      previousState[url] ? previousState : { ...previousState, [url]: true }
    );
  }, []);

  const handleClick = useCallback((index: number) => {
    onImageClick?.(index);
  }, [onImageClick]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      setCurrentIndex((prev) => Math.max(0, prev - 1));
    } else if (e.key === "ArrowRight") {
      setCurrentIndex((prev) => Math.min(media.length - 1, prev + 1));
    }
  }, [media.length, setCurrentIndex]);

  if (media.length === 0) return null;

  const maxH = aspect === "portrait" ? "max-h-[32rem]" : aspect === "video" ? "max-h-[28rem]" : "max-h-[24rem]";
  const currentImageUrl = media[currentIndex] ?? media[0];

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-hidden rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-deep)]">
        <div
          className="group relative overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label="Galeria de imagens do post"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            className={cn(
              "relative flex cursor-pointer items-center justify-center overflow-hidden",
              maxH
            )}
            style={{ touchAction: "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {media.length === 1 ? (
              failedMedia[currentImageUrl] ? (
                <MediaFallback />
              ) : (
                <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                  <Image
                    src={absMediaUrl(currentImageUrl)}
                    alt={authorName ? `Imagem de ${authorName}` : "Media do post"}
                    fill
                    priority={isPriority}
                    loading={isPriority ? "eager" : "lazy"}
                    decoding="async"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                    className="cursor-pointer object-contain transition-opacity hover:opacity-90"
                    onError={() => markAsFailed(currentImageUrl)}
                    onClick={() => handleClick(0)}
                  />
                </div>
              )
            ) : (
              <div
                className="flex h-full w-full transition-transform duration-300"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`,
                  willChange: "transform",
                }}
              >
                {media.map((url, index) => {
                  const isAdjacent = Math.abs(index - currentIndex) === 1;
                  return (
                  <div
                    key={url}
                    aria-hidden={index !== currentIndex}
                    className="flex min-w-full items-center justify-center overflow-hidden"
                  >
                    {failedMedia[url] ? (
                      <MediaFallback />
                    ) : (
                      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
                        <Image
                          src={absMediaUrl(url)}
                          alt={`Imagem ${index + 1} de ${media.length}`}
                          fill
                          priority={isPriority && index === 0}
                          loading={ (isPriority && index === 0) || isAdjacent ? "eager" : "lazy"}
                          decoding="async"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"
                          className="cursor-pointer object-contain transition-opacity hover:opacity-90"
                          onError={() => markAsFailed(url)}
                          onClick={() => handleClick(index)}
                        />
                      </div>
                    )}
                  </div>
                  );
                })}
              </div>
            )}

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((previousIndex) => Math.max(0, previousIndex - 1));
                  }}
                  aria-label="Imagem anterior"
                  className="canhoes-tap absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-[rgba(0,0,0,0.5)] p-1.5 text-[var(--text-primary)] opacity-0 shadow-lg transition-all group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex((previousIndex) =>
                      Math.min(media.length - 1, previousIndex + 1)
                    );
                  }}
                  aria-label="Próxima imagem"
                  className="canhoes-tap absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-[var(--border-subtle)] bg-[rgba(0,0,0,0.5)] p-1.5 text-[var(--text-primary)] opacity-0 shadow-lg transition-all group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={currentIndex === media.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {media.length > 1 && (
              <span
                className="pointer-events-none absolute left-3 top-3 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white"
                aria-live="polite"
                aria-atomic="true"
              >
                {currentIndex + 1} / {media.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {media.length > 1 && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {media.map((url, index) => (
            <button
              key={`dot-${url}-${index}`}
              type="button"
              aria-label={`Ir para imagem ${index + 1}`}
              className={cn(
                "canhoes-tap h-1.5 rounded-full transition-all",
                index === currentIndex
                  ? "w-6 bg-[var(--moss-glow)]"
                  : "w-2 bg-[var(--text-muted)]/30 hover:bg-[var(--text-muted)]/50"
              )}
              onClick={() => setCurrentIndex(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MediaFallback() {
  return (
    <div className="flex min-h-48 w-full flex-col items-center justify-center gap-2 bg-[var(--bg-deep)] px-4 text-center">
      <ImageOff className="h-5 w-5 text-[var(--text-muted)]" />
      <p className="text-sm font-medium text-[var(--text-muted)]">{feedCopy.media.unavailable}</p>
      <p className="max-w-[18rem] text-xs text-[var(--text-muted)]/70">{feedCopy.media.detail}</p>
    </div>
  );
}
