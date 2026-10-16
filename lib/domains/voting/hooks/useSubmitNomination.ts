"use client";

import { useState } from "react";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { MyNominationStatusDto, NomineeDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import messages from "@/messages/pt.json";

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
  const myStatusKey = ["nominations", eventId, "my-status"];
  const approvedKey = ["nominations", eventId, "approved"];

  const mutation = useMutation({
    mutationFn: () => awardsRepo.createNomination(eventId, { categoryId, title: titleTrimmed }),
    onMutate: async () => {
      const previousMyStatus = queryClient.getQueryData<MyNominationStatusDto | null>(myStatusKey);
      const previousApproved = queryClient.getQueryData<NomineeDto[]>(approvedKey);
      queryClient.setQueryData<MyNominationStatusDto | null>(myStatusKey, (current) => ({
        ...(current ?? { categoryId: null, nomineeId: null, nomineeTitle: null, status: null }),
        hasNomination: true,
        nomineeId: categoryId,
        nomineeTitle: titleTrimmed,
        categoryId,
        status: "pending",
      }));
      setPendingLabel(titleTrimmed);
      setTitle("");
      setFile(null);
      return { previousApproved, previousMyStatus };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMyStatus !== undefined) queryClient.setQueryData(myStatusKey, context.previousMyStatus);
      if (context?.previousApproved !== undefined) queryClient.setQueryData(approvedKey, context.previousApproved);
      setPendingLabel(null);
      logFrontendError("CanhoesNominations.createNomination", error, { categoryId, eventId });
      toast.error(getErrorMessage(error, copy.submitError));
    },
    onSuccess: async (createdNominee) => {
      if (file) {
        try {
          await awardsRepo.uploadNomineeImage(eventId, createdNominee.id, file);
        } catch {
          toast.error(copy.imageUploadError);
        }
      }
      setPendingLabel(titleTrimmed);
      toast.success(copy.submitted);
      await onNominationSubmitted();
    },
  });

  return { title, setTitle, file, setFile, pendingLabel, titleTrimmed, isValidTitle, mutation };
}
