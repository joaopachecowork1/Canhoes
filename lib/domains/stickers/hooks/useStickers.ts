"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CATEGORY_KIND } from "@/lib/categoryKind";
import { toast } from "sonner";

import type { AwardCategoryDto, NomineeDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.stickers.CanhoesStickerSubmitModule;
const MAX_STICKER_BYTES = 15 * 1024 * 1024;
const MIN_TITLE_LENGTH = 2;
const STALE_TIME_MS = 1000 * 60 * 2;

/** Sticker categories and the approved stickers that have an image. */
export function useStickerData(
  eventId: string | null,
  { initialCategories, initialNominees }: Readonly<{ initialCategories?: AwardCategoryDto[]; initialNominees?: NomineeDto[] }>
) {
  const queryClient = useQueryClient();
  const categoriesQuery = useQuery({
    queryKey: queryKeys.stickerCategories(eventId),
    queryFn: () => awardsRepo.getCategories(eventId ?? "").then((result) => result.items),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialCategories,
  });
  const nomineesQuery = useQuery({
    queryKey: queryKeys.approvedNominees(eventId),
    queryFn: () => awardsRepo.getApprovedNominees(eventId ?? ""),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialNominees,
  });

  const categories = categoriesQuery.data ?? [];
  const nominees = nomineesQuery.data ?? [];
  const error = categoriesQuery.error || nomineesQuery.error;

  return {
    stickerCategories: categories.filter((category) => category.kind === CATEGORY_KIND.STICKER),
    stickersWithImage: nominees.filter((nominee) => nominee.imageUrl),
    isLoading: categoriesQuery.isLoading || nomineesQuery.isLoading,
    isEmpty: categories.length === 0 && nominees.length === 0,
    errorMessage: error ? getErrorMessage(error, copy.loadError) : null,
    refresh: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.stickerCategories(eventId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.approvedNominees(eventId) }),
      ]),
  };
}

/** The chosen image and its preview URL, made when it is picked and revoked when replaced. */
function usePickedImage() {
  const [picked, setPicked] = useState<{ file: File; previewUrl: string } | null>(null);
  const pickedRef = useRef(picked);

  useEffect(() => () => {
    if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.previewUrl);
  }, []);

  const setFile = useCallback((file: File | null) => {
    if (pickedRef.current) URL.revokeObjectURL(pickedRef.current.previewUrl);
    pickedRef.current = file ? { file, previewUrl: URL.createObjectURL(file) } : null;
    setPicked(pickedRef.current);
  }, []);

  return { file: picked?.file ?? null, previewUrl: picked?.previewUrl ?? "", setFile };
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
  const { file, previewUrl, setFile } = usePickedImage();
  const canSubmit = isProposalPhase && title.trim().length >= MIN_TITLE_LENGTH && !isSubmitting;

  const handleFileChange = (nextFile: File | null) => {
    const rejection = nextFile ? getFileRejection(nextFile) : null;
    if (rejection) {
      toast.error(rejection);
      return;
    }
    setFile(nextFile);
  };

  /** Sends the sticker; resolves to whether it went through, so the form can close. */
  const handleSubmit = async () => {
    if (!canSubmit || !eventId) return false;

    setIsSubmitting(true);
    try {
      const createdNominee = await awardsRepo.createNomination(eventId, {
        categoryId: categoryId || null,
        title: title.trim(),
        kind: "stickers",
      });
      // The sticker exists from here on: a failed image must not make a retry send it again.
      const isImageMissing = file
        ? await awardsRepo.uploadNomineeImage(eventId, createdNominee.id, file).then(
            () => false,
            (uploadError) => {
              logFrontendError("CanhoesStickerSubmit.uploadImage", uploadError);
              return true;
            },
          )
        : false;

      setTitle("");
      setFile(null);
      await onSubmitted();
      if (isImageMissing) toast.warning(copy.imageUploadError);
      else toast.success(copy.submitted);
      return true;
    } catch (error) {
      logFrontendError("CanhoesStickerSubmit.handleSubmit", error);
      toast.error(getErrorMessage(error, copy.submitError));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { categoryId, setCategoryId, title, setTitle, file, previewUrl, isSubmitting, canSubmit, handleFileChange, handleSubmit };
}
