"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ImageLightboxProps = {
  images: string[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  authorName?: string;
  createdAtUtc?: string;
};

export function ImageLightbox({
  images,
  initialIndex,
  open,
  onClose,
  authorName,
  createdAtUtc,
}: Readonly<ImageLightboxProps>) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const touchStartX = useRef(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  const safeImages = (images ?? []).filter(Boolean);
  const totalSlides = safeImages.length;

  // Reset index when lightbox opens with a new image
  useEffect(() => {
    if (open) setCurrentIndex(initialIndex);
  }, [open, initialIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { onClose(); return; }
    if (e.key === "ArrowLeft" && currentIndex > 0) setCurrentIndex((i) => i - 1);
    if (e.key === "ArrowRight" && currentIndex < totalSlides - 1) setCurrentIndex((i) => i + 1);
  }, [currentIndex, totalSlides, onClose]);

  // Touch swipe
  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX < 0 && currentIndex < totalSlides - 1) setCurrentIndex((i) => i + 1);
      else if (deltaX > 0 && currentIndex > 0) setCurrentIndex((i) => i - 1);
    }
  };

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || safeImages.length === 0) return null;

  const currentImageUrl = safeImages[currentIndex] ?? safeImages[0];

  const lightboxContent = (
    <div className="animate-fade-in fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--bg-overlay)] backdrop-blur-[10px]"
      onKeyDown={handleKeyDown}
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Visualizador de imagem"
      tabIndex={-1}
    >
      {/* Click backdrop to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/10 p-2 text-white motion-safe-smooth hover:bg-white/20"
        aria-label="Fechar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter badge */}
      {totalSlides > 1 && (
        <div
          className="absolute left-4 top-4 z-10 rounded-full border border-white/10 bg-black/50 px-3 py-1 text-xs font-medium text-white"
          aria-live="polite"
        >
          {currentIndex + 1} / {totalSlides}
        </div>
      )}

      {/* Author info */}
      {authorName && (
        <div className="absolute left-4 bottom-4 z-10 rounded-[var(--radius-md-token)] border border-white/10 bg-black/35 px-3 py-2 text-xs text-white/75 backdrop-blur-sm">
          <span className="font-medium text-white/80">{authorName}</span>
          {createdAtUtc && (
            <span className="ml-2">
              {new Date(createdAtUtc).toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
        </div>
      )}

      {/* Previous arrow */}
      {currentIndex > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i - 1); }}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 p-2 text-white shadow-lg motion-safe-smooth hover:bg-white/20"
          aria-label="Imagem anterior"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Image */}
      <div
        className="relative z-[1] mx-4 my-auto max-h-[90vh] max-w-[90vw] touch-pan-x"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={currentImageUrl}
          alt={authorName ? `Imagem de ${authorName}` : "Imagem do post"}
          className="max-h-[90vh] max-w-[90vw] object-contain"
          draggable={false}
          width={1200}
          height={900}
          style={{ width: "auto", height: "auto" }}
          unoptimized
        />
      </div>

      {/* Next arrow */}
      {currentIndex < totalSlides - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setCurrentIndex((i) => i + 1); }}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-white/10 p-2 text-white shadow-lg motion-safe-smooth hover:bg-white/20"
          aria-label="Próxima imagem"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Dots indicator */}
      {totalSlides > 1 && (
        <div className="absolute bottom-16 left-1/2 z-10 -translate-x-1/2 flex items-center gap-1.5">
          {safeImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === currentIndex
                  ? "w-6 bg-white"
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Ir para imagem ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(lightboxContent, document.body);
}
