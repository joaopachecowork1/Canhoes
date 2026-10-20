"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CastOfficialVoteRequest, EventVotingBoardDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import messages from "@/messages/pt.json";

import { applyVoteSelection } from "../rules/votingBoard";
import { queryKeys } from "@/lib/queryKeys";

const REFRESH_INTERVAL_MS = 20_000;

/** The ballot, refreshed every 20s while the tab is visible, and an optimistic vote. */
export function useOfficialVoting(eventId: string | null, initialData: EventVotingBoardDto | undefined) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.officialVoting(eventId);

  const votingBoardQuery = useQuery({
    queryKey,
    enabled: Boolean(eventId),
    queryFn: () => awardsRepo.getVotingBoard(eventId ?? ""),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? REFRESH_INTERVAL_MS : false,
  });

  const castVoteMutation = useMutation({
    mutationFn: (vote: CastOfficialVoteRequest) => awardsRepo.castOfficialVote(eventId ?? "", vote),
    onMutate: async (vote) => {
      if (!eventId) return { previousBoardData: null };

      await queryClient.cancelQueries({ queryKey });
      const previousBoardData = queryClient.getQueryData<EventVotingBoardDto>(queryKey);
      queryClient.setQueryData<EventVotingBoardDto>(queryKey, (board) => (board ? applyVoteSelection(board, vote) : board));
      return { previousBoardData };
    },
    onError: (error, _vote, mutationContext) => {
      if (eventId && mutationContext?.previousBoardData) queryClient.setQueryData(queryKey, mutationContext.previousBoardData);
      logFrontendError("CanhoesOfficialVoting.castVote", error, { eventId });
      toast.error(getErrorMessage(error, messages.voting.CanhoesOfficialVotingModule.voteError));
    },
    onSuccess: async () => {
      if (eventId) await queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });

  return { votingBoardQuery, castVoteMutation };
}
