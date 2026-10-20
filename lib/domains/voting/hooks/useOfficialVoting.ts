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

/** O boletim de voto, atualizado de 20 em 20 s com o separador visível, e o voto otimista. */
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
    // Sem polling em segundo plano: só atualiza enquanto o utilizador está a ver a página.
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? REFRESH_INTERVAL_MS : false,
  });

  const castVoteMutation = useMutation({
    mutationFn: (vote: CastOfficialVoteRequest) => awardsRepo.castOfficialVote(eventId ?? "", vote),
    onMutate: async (vote) => {
      if (!eventId) return { previousBoardData: null };

      // Cancela refetches em curso para não sobrescreverem o voto otimista.
      await queryClient.cancelQueries({ queryKey });

      // Guarda o boletim anterior (contexto da mutação) para o rollback em `onError`.
      const previousBoardData = queryClient.getQueryData<EventVotingBoardDto>(queryKey);
      queryClient.setQueryData<EventVotingBoardDto>(queryKey, (board) =>
        board ? applyVoteSelection(board, vote) : board,
      );
      return { previousBoardData };
    },

    // Rollback: repõe o boletim guardado em `onMutate`.
    onError: (error, _vote, mutationContext) => {
      if (eventId && mutationContext?.previousBoardData)
        queryClient.setQueryData(queryKey, mutationContext.previousBoardData);
      logFrontendError("CanhoesOfficialVoting.castVote", error, { eventId });
      toast.error(getErrorMessage(error, messages.voting.CanhoesOfficialVotingModule.voteError));
    },
    // Depois de gravar, vai buscar o boletim real (contagens e escolhas confirmadas pelo servidor).
    onSuccess: async () => {
      if (eventId) await queryClient.invalidateQueries({ queryKey, exact: true });
    },
  });

  return { votingBoardQuery, castVoteMutation };
}
