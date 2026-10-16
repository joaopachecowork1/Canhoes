"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";
import messages from "@/messages/pt.json";

import { getFilledPollOptions, isPollReady } from "../rules/composeRules";

const copy = messages.feed.compose;

export type PublishStatus = "idle" | "uploading" | "publishing";

export type PostDraft = {
  text: string;
  files: File[];
  poll: { isEnabled: boolean; question: string; options: string[] };
};

/** Why a draft cannot be sent yet, or null when it can. */
function getDraftProblem(draft: PostDraft, eventId: string | null) {
  if (draft.poll.isEnabled && !isPollReady(draft.poll.question, draft.poll.options)) return copy.pollIncomplete;
  if (!eventId) return copy.noActiveEvent;
  return null;
}

async function uploadImages(eventId: string, files: File[]) {
  if (files.length === 0) return [];
  const uploadedUrls = await feedRepo.uploadFeedImages(eventId, files);
  if (uploadedUrls?.length !== files.length) throw new Error(copy.uploadFailed);
  return uploadedUrls;
}

function toCreatePostRequest(draft: PostDraft, text: string, mediaUrls: string[]) {
  if (!draft.poll.isEnabled) return { text, mediaUrls, pollOptions: null, pollQuestion: null };
  return {
    text,
    mediaUrls,
    pollOptions: getFilledPollOptions(draft.poll.options),
    pollQuestion: draft.poll.question.trim() || null,
  };
}

/** Uploads the images, then creates the post and tells the feed about it. */
export function usePublishPost(eventId: string | null) {
  const [status, setStatus] = useState<PublishStatus>("idle");

  const publish = useCallback(
    async (draft: PostDraft) => {
      const text = draft.text.trim();
      if (!text) return false;

      const problem = getDraftProblem(draft, eventId);
      if (problem || !eventId) {
        toast.error(problem ?? copy.noActiveEvent);
        return false;
      }

      try {
        setStatus("uploading");
        const mediaUrls = await uploadImages(eventId, draft.files);

        setStatus("publishing");
        const createdPost = await feedRepo.createPost(eventId, toCreatePostRequest(draft, text, mediaUrls));

        if (createdPost?.id) globalThis.dispatchEvent(new CustomEvent("hub:postCreated", { detail: createdPost }));
        toast.success(copy.published);
        return true;
      } catch (error) {
        logFrontendError("CanhoesComposeSheet.createPost", error);
        toast.error(getErrorMessage(error, copy.publishError, { 413: copy.payloadTooLarge }));
        return false;
      } finally {
        setStatus("idle");
      }
    },
    [eventId]
  );

  return { status, publish };
}
