"use client";

import { ImageOff } from "lucide-react";

import { absMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type CanhoesMediaThumbProps = {
  alt: string;
  frameClassName?: string;
  iconClassName?: string;
  imageClassName?: string;
  normalizeSrc?: boolean;
  src?: string | null;
};

/**
 * Miniatura de media (imagem ou ícone de recurso).
 */
export function CanhoesMediaThumb({
  alt,
  frameClassName,
  iconClassName,
  imageClassName,
  normalizeSrc = true,
  src,
}: Readonly<CanhoesMediaThumbProps>) {
  let resolvedSrc: string | null = null;
  if (src) resolvedSrc = normalizeSrc ? absMediaUrl(src) : src;

  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-veil)]/5",
        frameClassName,
      )}
    >
      {resolvedSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolvedSrc}
          alt={alt}
          className={cn("h-full w-full object-cover", imageClassName)}
          loading="lazy"
          decoding="async"
          sizes="56px"
        />
      ) : (
        <ImageOff className={cn("h-4 w-4 text-[var(--color-text-muted)]", iconClassName)} />
      )}
    </div>
  );
}
