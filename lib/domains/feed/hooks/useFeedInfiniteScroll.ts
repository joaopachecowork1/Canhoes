"use client";

import { useEffect, useRef } from "react";

type UseFeedInfiniteScrollParams = {
  enabled: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
};

/** Uma ref para um elemento sentinela; quando entra no ecrã carrega a página seguinte (se não houver uma a carregar). */
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
      // Margem de 200px: começa a carregar um pouco antes de o utilizador chegar ao fim.
      { rootMargin: "200px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled, isFetchingNextPage, onLoadMore]);

  return sentinelRef;
}
