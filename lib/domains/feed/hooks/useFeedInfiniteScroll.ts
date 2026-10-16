"use client";

import { useEffect, useRef } from "react";

type UseFeedInfiniteScrollParams = {
  enabled: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

export function useFeedInfiniteScroll({
  enabled,
  isFetchingNextPage,
  onLoadMore,
}: Readonly<UseFeedInfiniteScrollParams>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !enabled) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && !isFetchingNextPage) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, isFetchingNextPage, onLoadMore]);

  return sentinelRef;
}
