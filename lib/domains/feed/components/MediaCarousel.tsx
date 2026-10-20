"use client";

import { useCallback, useState } from "react";

import { formatMessage } from "@/lib/messages";
import { cn } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { useCarouselGesture } from "../hooks/useCarouselGesture";
import {
  CarouselControls,
  CarouselDots,
  CarouselImage,
  CarouselTrack,
  MAX_HEIGHT_BY_ASPECT,
} from "./MediaCarouselParts";

const copy = messages.feed.MediaCarousel;

export type MediaCarouselProps = {
  urls: string[];
  className?: string;
  aspect?: "square" | "portrait" | "video";
  onImageClick?: (index: number) => void;
  authorName?: string;
  isPriority?: boolean;
};

/** Guarda quais imagens falharam a carregar, para mostrar um aviso no lugar delas. */
function useFailedMedia() {
  const [failedMedia, setFailedMedia] = useState<Record<string, boolean>>({});
  const markAsFailed = useCallback((url: string) => {
    setFailedMedia((previousState) => (previousState[url] ? previousState : { ...previousState, [url]: true }));
  }, []);

  return { failedMedia, markAsFailed };
}

/** Images of a post: one image as is, several as a swipeable strip with arrows and dots. */
export function MediaCarousel({
  urls,
  className,
  aspect = "square",
  onImageClick,
  authorName,
  isPriority = false,
}: Readonly<MediaCarouselProps>) {
  const media = urls.filter(Boolean);
  const { failedMedia, markAsFailed } = useFailedMedia();
  const { currentIndex, setCurrentIndex, handleTouchEnd, handleTouchMove, handleTouchStart } = useCarouselGesture(
    media.length,
  );
  // The gesture hook keeps the index inside the strip.
  const showPrevious = useCallback(() => setCurrentIndex((index) => index - 1), [setCurrentIndex]);
  const showNext = useCallback(() => setCurrentIndex((index) => index + 1), [setCurrentIndex]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowLeft") showPrevious();
    else if (event.key === "ArrowRight") showNext();
  };

  if (media.length === 0) return null;

  const isSingle = media.length === 1;
  const singleAlt = authorName ? formatMessage(copy.authorImageAlt, { name: authorName }) : copy.postMediaAlt;

  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-hidden rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-deep)]">
        <div
          className="group relative overflow-hidden"
          role="region"
          aria-roledescription={copy.roleDescription}
          aria-label={authorName ? formatMessage(copy.authorGalleryLabel, { name: authorName }) : copy.galleryLabel}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div
            className={cn(
              "relative flex cursor-pointer items-center justify-center overflow-hidden",
              MAX_HEIGHT_BY_ASPECT[aspect],
            )}
            style={{ touchAction: "pan-y" }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {isSingle ? (
              <CarouselImage
                url={media[0]}
                alt={singleAlt}
                isFailed={Boolean(failedMedia[media[0]])}
                isPriority={isPriority}
                isEager={isPriority}
                onError={() => markAsFailed(media[0])}
                onClick={() => onImageClick?.(0)}
              />
            ) : (
              <CarouselTrack
                currentIndex={currentIndex}
                failedMedia={failedMedia}
                isPriority={isPriority}
                media={media}
                onError={markAsFailed}
                onImageClick={onImageClick}
              />
            )}

            {isSingle ? null : (
              <CarouselControls
                currentIndex={currentIndex}
                total={media.length}
                onPrevious={showPrevious}
                onNext={showNext}
              />
            )}
          </div>
        </div>
      </div>

      {isSingle ? null : <CarouselDots currentIndex={currentIndex} media={media} onSelect={setCurrentIndex} />}
    </div>
  );
}
