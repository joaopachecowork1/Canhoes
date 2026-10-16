"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AwardCategoryDto, NomineeDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import messages from "@/messages/pt.json";

const copy = messages.stickers.CanhoesStickerSubmitModule;
const MAX_STICKER_BYTES = 15 * 1024 * 1024;
const MIN_TITLE_LENGTH = 2;
const STICKER_CATEGORY_KIND = 2;
const STALE_TIME_MS = 1000 * 60 * 2;

/** Sticker categories and the approved stickers that have an image. */
export function useStickerData(
  eventId: string | null,
  { initialCategories, initialNominees }: Readonly<{ initialCategories?: AwardCategoryDto[]; initialNominees?: NomineeDto[] }>
) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: ["stickerCategories", eventId],
    queryFn: () => awardsRepo.getCategories(eventId ?? "").then((result) => result.items),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialCategories,
  });
  const nomineesQuery = useQuery({
    queryKey: ["approvedNominees", eventId],
    queryFn: () => awardsRepo.getApprovedNominees(eventId ?? ""),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialNominees,
  });

  const categories = categoriesQuery.data ?? [];
  const nominees = nomineesQuery.data ?? [];
  const error = categoriesQuery.error || nomineesQuery.error;

  return {
    stickerCategories: categories.filter((category) => category.kind === STICKER_CATEGORY_KIND),
    stickersWithImage: nominees.filter((nominee) => nominee.imageUrl),
    isLoading: categoriesQuery.isLoading || nomineesQuery.isLoading,
    isEmpty: categories.length === 0 && nominees.length === 0,
    errorMessage: error ? getErrorMessage(error, copy.loadError) : null,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stickerCategories", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["approvedNominees", eventId] }),
      ]),
  };
}

function useFilePreviewUrl(file: File | null) {
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return previewUrl;
}

function getFileRejection(file: File) {
  if (!file.type.startsWith("image/")) return copy.imagesOnly;
  if (file.size > MAX_STICKER_BYTES) return copy.imageTooLarge;
  return null;
}

/** The sticker form: category, title and an image checked before it is accepted. */
export function useStickerSubmission({ eventId, isProposalPhase, onSubmitted }: Readonly<{ eventId: string | null; isProposalPhase: boolean; onSubmitted: () => Promise<unknown> }>) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const previewUrl = useFilePreviewUrl(file);
  const canSubmit = isProposalPhase && title.trim().length >= MIN_TITLE_LENGTH && !isSubmitting;

  const handleFileChange = (nextFile: File | null) => {
    const rejection = nextFile ? getFileRejection(nextFile) : null;
    if (rejection) {
      toast.error(rejection);
      return;
    }
    setFile(nextFile);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !eventId) return;

    setIsSubmitting(true);
    try {
      const createdNominee = await awardsRepo.createNomination(eventId, {
        categoryId: categoryId || null,
        title: title.trim(),
        kind: "stickers",
      });
      if (file) await awardsRepo.uploadNomineeImage(eventId, createdNominee.id, file);

      setTitle("");
      setFile(null);
      await onSubmitted();
      toast.success(copy.submitted);
    } catch (error) {
      logFrontendError("CanhoesStickerSubmit.handleSubmit", error);
      toast.error(getErrorMessage(error, copy.submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return { categoryId, setCategoryId, title, setTitle, file, previewUrl, isSubmitting, canSubmit, handleFileChange, handleSubmit };
}
