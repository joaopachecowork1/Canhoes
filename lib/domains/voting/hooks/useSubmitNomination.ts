"use client";

import { useState } from "react";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MyNominationDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import messages from "@/messages/pt.json";

const copy = messages.voting.CategoryNominationCard;
/** Limites de tamanho do título de uma nomeação. */
export const NOMINATION_TITLE_MIN = 2;
export const NOMINATION_TITLE_MAX = 120;

type SubmitNominationArgs = {
  categoryId: string;
  eventId: string;
  onNominationSubmitted: () => Promise<void>;
  queryClient: QueryClient;
};

/**
 * Uma nomeação por categoria: mostra-a logo como pendente, faz rollback se falhar e
 * envia a imagem opcional depois de o nomeado existir.
 */
export function useSubmitNomination({
  categoryId,
  eventId,
  onNominationSubmitted,
  queryClient,
}: Readonly<SubmitNominationArgs>) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const titleTrimmed = title.trim();
  const isValidTitle = titleTrimmed.length >= NOMINATION_TITLE_MIN && titleTrimmed.length <= NOMINATION_TITLE_MAX;
  const mineKey = queryKeys.nominationsMine(eventId);

  const mutation = useMutation({
    // O título viaja como variável da mutação: o onMutate limpa o campo antes de o mutationFn correr.
    mutationFn: (nomineeTitle: string) => awardsRepo.createNomination(eventId, { categoryId, title: nomineeTitle }),
    onMutate: async (nomineeTitle) => {
      // Guarda a lista anterior para o rollback e mostra já a nomeação como pendente.
      const previousMine = queryClient.getQueryData<MyNominationDto[]>(mineKey);
      queryClient.setQueryData<MyNominationDto[]>(mineKey, (current = []) => [
        { categoryId, nomineeId: null, nomineeTitle, status: "pending" },
        ...current,
      ]);
      // Limpa o formulário de imediato; o utilizador pode já escrever outra.
      setPendingLabel(nomineeTitle);
      setTitle("");
      setFile(null);
      return { previousMine };
    },
    // Rollback: repõe a lista anterior de nomeações.
    onError: (error, _variables, context) => {
      if (context?.previousMine !== undefined) queryClient.setQueryData(mineKey, context.previousMine);
      setPendingLabel(null);
      logFrontendError("CanhoesNominations.createNomination", error, { categoryId, eventId });
      toast.error(getErrorMessage(error, copy.submitError));
    },
    onSuccess: async (createdNominee, nomineeTitle) => {
      // A imagem sobe depois de a nomeação existir (precisa do id); se falhar, a nomeação fica e só se avisa.
      if (file) {
        try {
          await awardsRepo.uploadNomineeImage(eventId, createdNominee.id, file);
        } catch {
          toast.error(copy.imageUploadError);
        }
      }
      setPendingLabel(nomineeTitle);
      toast.success(copy.submitted);
      await onNominationSubmitted();
    },
  });

  return { title, setTitle, file, setFile, pendingLabel, titleTrimmed, isValidTitle, mutation };
}
