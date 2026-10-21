import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EventGatheringRsvpStatus } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";
import { queryKeys } from "@/lib/queryKeys";

import { updatePostInFeed, type FeedInfiniteData } from "./feedInfiniteData";

function reportFeedError(action: string, error: unknown, context: Record<string, unknown>, fallback: string) {
  logFrontendError(`HubFeed.${action}`, error, context);
  toast.error(getErrorMessage(error, fallback));
}

/** Ações sobre encontros (votar em data, confirmar data e RSVP), atualizando o post no feed. */
export function useGatheringPostActions(queryClient: QueryClient, eventId: string | null) {
  const updateFeed = useCallback(
    (update: (feed: FeedInfiniteData | undefined) => FeedInfiniteData | undefined) => {
      if (!eventId) return undefined;
      const queryKey = queryKeys.hubPosts(eventId);
      const previous = queryClient.getQueryData<FeedInfiniteData>(queryKey);
      queryClient.setQueryData<FeedInfiniteData>(queryKey, update);
      return previous;
    },
    [queryClient, eventId],
  );

  const voteGatheringDate = useCallback(
    async (postId: string, gatheringId: string, optionId: string) => {
      if (!eventId) return;
      try {
        const updated = await feedRepo.voteGatheringDate(eventId, gatheringId, optionId);
        updateFeed((feed) => updatePostInFeed(feed, postId, (post) => ({ ...post, gathering: updated })));
      } catch (error) {
        reportFeedError("voteGatheringDate", error, { gatheringId, optionId }, "Não foi possível registar o voto.");
      }
    },
    [eventId, updateFeed],
  );

  const confirmGatheringDate = useCallback(
    async (postId: string, gatheringId: string, dateText: string) => {
      if (!eventId) return;
      try {
        const updated = await feedRepo.confirmGatheringDate(eventId, gatheringId, dateText);
        updateFeed((feed) => updatePostInFeed(feed, postId, (post) => ({ ...post, gathering: updated })));
        toast.success("Data confirmada com sucesso.");
      } catch (error) {
        reportFeedError("confirmGatheringDate", error, { gatheringId, dateText }, "Não foi possível confirmar a data.");
      }
    },
    [eventId, updateFeed],
  );

  const submitGatheringRsvp = useCallback(
    async (postId: string, gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => {
      if (!eventId) return;
      try {
        const updated = await feedRepo.submitGatheringRsvp(eventId, gatheringId, { status, note });
        updateFeed((feed) => updatePostInFeed(feed, postId, (post) => ({ ...post, gathering: updated })));
        toast.success("Presença registada.");
      } catch (error) {
        reportFeedError("submitGatheringRsvp", error, { gatheringId, status }, "Não foi possível registar a presença.");
      }
    },
    [eventId, updateFeed],
  );

  return { voteGatheringDate, confirmGatheringDate, submitGatheringRsvp };
}
