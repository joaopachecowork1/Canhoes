"use client";

import { ArrowLeft, ArrowRight, GripHorizontal, X } from "lucide-react";
import messages from "@/messages/pt.json";

type ComposeMediaGridProps = {
  files: File[];
  maxFiles: number;
  previewUrls: string[];
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (index: number) => void;
};

/** A grelha de pré-visualização das imagens escolhidas, com mover e remover. */
export function ComposeMediaGrid({ files, maxFiles, previewUrls, onMove, onRemove }: Readonly<ComposeMediaGridProps>) {
  if (files.length === 0) return null;
  const composeCopy = messages.feed.compose;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
        <span className="inline-flex items-center gap-1">
          <GripHorizontal className="h-3.5 w-3.5" />
          {composeCopy.mediaOrderLabel}
        </span>
        <span>
          {files.length}/{maxFiles}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {files.map((selectedFile, index) => (
          <div
            key={`${selectedFile.name}-${selectedFile.size}-${index}`}
            className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--color-border-strong)]/25 bg-[var(--color-bg-surface-alt)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrls[index]}
              className="h-full w-full object-cover"
              alt={selectedFile.name}
              loading="lazy"
              decoding="async"
            />

            <div className="absolute left-1 top-1 rounded-md bg-[var(--color-bg-base)]/80 px-1.5 py-0.5 text-xs font-semibold text-[var(--color-text-primary)]">
              {index + 1}
            </div>

            <div className="absolute inset-x-1 bottom-1 flex items-center justify-between gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={() => onMove(index, -1)}
                disabled={index === 0}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-bg-base)]/80 text-[var(--color-text-primary)] disabled:opacity-40"
                aria-label={composeCopy.moveLeft}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>

              <button
                type="button"
                onClick={() => onMove(index, 1)}
                disabled={index === files.length - 1}
                className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-bg-base)]/80 text-[var(--color-text-primary)] disabled:opacity-40"
                aria-label={composeCopy.moveRight}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-bg-base)]/80 text-[var(--color-text-primary)] opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              aria-label={composeCopy.removeImage}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
