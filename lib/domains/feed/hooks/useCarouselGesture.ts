"use client";

import { useCallback, useRef, useState, type SetStateAction, type TouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 50;
const DRAG_START_PX = 10;

/**
 * Current slide plus touch handlers: a mostly horizontal swipe past 50px changes slide. The slide
 * stays inside `totalSlides`, also when slides are removed, without syncing state in an effect.
 */
export function useCarouselGesture(totalSlides: number) {
  const lastIndex = Math.max(totalSlides - 1, 0);
  const [storedIndex, setStoredIndex] = useState(0);
  const currentIndex = Math.min(storedIndex, lastIndex);
  const setCurrentIndex = useCallback(
    (update: SetStateAction<number>) =>
      setStoredIndex((previous) => {
        const next = typeof update === "function" ? update(Math.min(previous, lastIndex)) : update;
        return Math.min(Math.max(next, 0), lastIndex);
      }),
    [lastIndex],
  );
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
    if (deltaX > deltaY && deltaX > DRAG_START_PX) isDragging.current = true;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    if (!isDragging.current) return;

    const deltaX = event.changedTouches[0].clientX - touchStartX.current;
    if (deltaX < -SWIPE_THRESHOLD_PX && currentIndex < totalSlides - 1) {
      setCurrentIndex((previousIndex) => previousIndex + 1);
    } else if (deltaX > SWIPE_THRESHOLD_PX && currentIndex > 0) {
      setCurrentIndex((previousIndex) => previousIndex - 1);
    }
    isDragging.current = false;
  };

  return { currentIndex, handleTouchEnd, handleTouchMove, handleTouchStart, setCurrentIndex };
}
