"use client";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.feed.FeedLoadMore;

type FeedLoadMoreProps = {
  hasMore: boolean;
  isFetchingNextPage: boolean;
  remainingCount: number;
  onLoadMore: () => void;
  sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
};

export function FeedLoadMore({
  hasMore,
  isFetchingNextPage,
  remainingCount,
  onLoadMore,
  sentinelRef,
}: Readonly<FeedLoadMoreProps>) {
  if (!hasMore) return null;

  return (
    <>
      <div ref={sentinelRef} className="flex justify-center py-6">
        {isFetchingNextPage ? (
          <div className="border border-[var(--color-veil)]/5 bg-[var(--color-veil)]/2.5 shadow-none rounded-[1.25rem] flex flex-col items-center gap-3 px-4 py-3">
            <div className="skeleton-shimmer h-6 w-6 rounded-full" />
            <span className="text-xs text-[var(--text-muted)]">{copy.loading}</span>
          </div>
        ) : (
          <div className="h-10 w-10 rounded-full border-2 border-dashed border-[var(--border-subtle)] animate-pulse" />
        )}
      </div>

      {!isFetchingNextPage ? (
        <div
          className="animate-fade-in flex justify-center py-2"
        >
          <button
            type="button"
            onClick={onLoadMore}
            className="border border-[var(--color-veil)]/5 bg-[var(--color-veil)]/2.5 shadow-none rounded-[1.25rem] px-6 py-2 text-xs font-medium text-[var(--text-muted)] hover:border-[var(--border-moss)] hover:text-[var(--text-primary)] active:scale-95 transition-transform"
            aria-label={copy.loadMoreLabel}
          >
            {formatMessage(copy.loadMore, { count: Math.max(remainingCount, 0) })}
          </button>
        </div>
      ) : null}
    </>
  );
}

