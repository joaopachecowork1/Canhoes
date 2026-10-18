"use client";

import { useState } from "react";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MyNominationDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import messages from "@/messages/pt.json";

import { myNominationsKey } from "./useNominationsModule";

const copy = messages.voting.CategoryNominationCard;
export const NOMINATION_TITLE_MIN = 2;
export const NOMINATION_TITLE_MAX = 120;

type SubmitNominationArgs = {
  categoryId: string;
  eventId: string;
  onNominationSubmitted: () => Promise<void>;
  queryClient: QueryClient;
};

/**
 * One nomination per category: shows it as pending straight away, rolls back on failure and
 * uploads the optional image once the nominee exists.
 */
export function useSubmitNomination({ categoryId, eventId, onNominationSubmitted, queryClient }: Readonly<SubmitNominationArgs>) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const titleTrimmed = title.trim();
  const isValidTitle = titleTrimmed.length >= NOMINATION_TITLE_MIN && titleTrimmed.length <= NOMINATION_TITLE_MAX;
  const mineKey = myNominationsKey(eventId);

  const mutation = useMutation({
    // The title travels as the mutation variable: onMutate clears the input before mutationFn runs.
    mutationFn: (nomineeTitle: string) => awardsRepo.createNomination(eventId, { categoryId, title: nomineeTitle }),
    onMutate: async (nomineeTitle) => {
      const previousMine = queryClient.getQueryData<MyNominationDto[]>(mineKey);
      queryClient.setQueryData<MyNominationDto[]>(mineKey, (current = []) => [
        { categoryId, nomineeId: null, nomineeTitle, status: "pending" },
        ...current,
      ]);
      setPendingLabel(nomineeTitle);
      setTitle("");
      setFile(null);
      return { previousMine };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMine !== undefined) queryClient.setQueryData(mineKey, context.previousMine);
      setPendingLabel(null);
      logFrontendError("CanhoesNominations.createNomination", error, { categoryId, eventId });
      toast.error(getErrorMessage(error, copy.submitError));
    },
    onSuccess: async (createdNominee, nomineeTitle) => {
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
