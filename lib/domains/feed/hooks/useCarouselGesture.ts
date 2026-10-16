"use client";

import { useRef, useState, type TouchEvent } from "react";

const SWIPE_THRESHOLD_PX = 50;
const DRAG_START_PX = 10;

/** Current slide plus touch handlers: a mostly horizontal swipe past 50px changes slide. */
export function useCarouselGesture(totalSlides: number) {
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
