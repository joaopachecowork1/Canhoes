import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import type { FeedInfiniteData } from "./feedInfiniteData";

/** Regista o erro do feed no logger e apresenta um toast com a mensagem amigável. */
export function reportFeedError(
  action: string,
  error: unknown,
  { context, fallback }: Readonly<{ context: Record<string, unknown>; fallback: string }>,
) {
  logFrontendError(`HubFeed.${action}`, error, context);
  toast.error(getErrorMessage(error, fallback));
}

/** Altera o feed em cache de um evento e devolve o estado anterior, para servir de rollback. */
export function useFeedCache(queryClient: QueryClient, eventId: string | null) {
  return useCallback(
    (update: (feed: FeedInfiniteData | undefined) => FeedInfiniteData | undefined) => {
      if (!eventId) return undefined;
      const queryKey = queryKeys.hubPosts(eventId);
      const previous = queryClient.getQueryData<FeedInfiniteData>(queryKey);
      queryClient.setQueryData<FeedInfiniteData>(queryKey, update);
      return previous;
    },
    [queryClient, eventId],
  );
}
