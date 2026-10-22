import { useCallback } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { EventGatheringRsvpStatus } from "@/lib/api/types";
import { feedRepo } from "@/lib/repositories/feedRepo";
import messages from "@/messages/pt.json";

import { reportFeedError, useFeedCache } from "./feedActionUtils";
import { updatePostInFeed } from "./feedInfiniteData";

const copy = messages.feed.useGatheringPostActions;

/** Ações sobre encontros (votar em data, confirmar data e RSVP), atualizando o post no feed. */
export function useGatheringPostActions(queryClient: QueryClient, eventId: string | null) {
  const updateFeed = useFeedCache(queryClient, eventId);

  const voteGatheringDate = useCallback(
    async (postId: string, gatheringId: string, optionId: string) => {
      if (!eventId) return;
      try {
        const updated = await feedRepo.voteGatheringDate(eventId, gatheringId, optionId);
        updateFeed((feed) => updatePostInFeed(feed, postId, (post) => ({ ...post, gathering: updated })));
      } catch (error) {
        reportFeedError("voteGatheringDate", error, {
          context: { gatheringId, optionId },
          fallback: copy.voteError,
        });
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
        toast.success(copy.confirmSuccess);
      } catch (error) {
        reportFeedError("confirmGatheringDate", error, {
          context: { gatheringId, dateText },
          fallback: copy.confirmError,
        });
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
        toast.success(copy.rsvpSuccess);
      } catch (error) {
        reportFeedError("submitGatheringRsvp", error, {
          context: { gatheringId, status },
          fallback: copy.rsvpError,
        });
      }
    },
    [eventId, updateFeed],
  );

  return { voteGatheringDate, confirmGatheringDate, submitGatheringRsvp };
}
