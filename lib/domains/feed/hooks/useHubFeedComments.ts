import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { HubCommentDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";
import messages from "@/messages/pt.json";

import { updatePostInFeed, type FeedInfiniteData } from "./feedInfiniteData";
import { applyCommentReaction, changeCommentCount } from "./feedPostUpdates";

export const COMMENTS_QUERY_KEY = "hub-comments";
const FEED_POSTS_QUERY_KEY = "hub-posts";
const copy = messages.feed.useHubFeedComments;

type UseHubFeedCommentsArgs = {
  eventId: string | null;
  queryClient: QueryClient;
};

function reportCommentError(action: string, error: unknown, { context, fallback }: Readonly<{ context: Record<string, unknown>; fallback: string }>) {
  logFrontendError(`HubFeed.${action}`, error, context);
  toast.error(getErrorMessage(error, fallback));
}

/** Per post: whether its comments are open, the unsent reply and which comment it answers. */
function useCommentDrafts(eventId: string | null) {
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingToMap] = useState<Record<string, string | null>>({});

  // Callbacks read the latest drafts without being recreated on every keystroke.
  const draftsRef = useRef(commentDrafts);
  draftsRef.current = commentDrafts;
  const replyingToRef = useRef(replyingTo);
  replyingToRef.current = replyingTo;

  useEffect(() => {
    setOpenComments({});
    setCommentDrafts({});
    setReplyingToMap({});
  }, [eventId]);

  const toggleComments = useCallback((postId: string) => {
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const setCommentDraft = useCallback((postId: string, draft: string) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: draft }));
  }, []);

  const setReplyingTo = useCallback((postId: string, commentId: string | null) => {
    setReplyingToMap((prev) => ({ ...prev, [postId]: commentId }));
  }, []);

  /** After a reply is sent: clear it and keep the thread open to show it. */
  const markSent = useCallback((postId: string) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    setReplyingToMap((prev) => ({ ...prev, [postId]: null }));
    setOpenComments((prev) => ({ ...prev, [postId]: true }));
  }, []);

  return { openComments, commentDrafts, replyingTo, draftsRef, replyingToRef, toggleComments, setCommentDraft, setReplyingTo, markSent };
}

export function useHubFeedComments({ eventId, queryClient }: Readonly<UseHubFeedCommentsArgs>) {
  const drafts = useCommentDrafts(eventId);
  const { draftsRef, replyingToRef, markSent } = drafts;

  const updateCommentCount = useCallback(
    (postId: string, delta: 1 | -1) => {
      queryClient.setQueryData<FeedInfiniteData>([FEED_POSTS_QUERY_KEY, eventId], (feed) =>
        updatePostInFeed(feed, postId, (post) => changeCommentCount(post, delta))
      );
    },
    [eventId, queryClient]
  );

  const addComment = useCallback(
    async (postId: string) => {
      if (!eventId) return;
      const text = (draftsRef.current[postId] ?? "").trim();
      if (!text) return;

      try {
        const newComment = await feedRepo.createComment(eventId, postId, { text, replyToId: replyingToRef.current[postId] || null });
        markSent(postId);
        if (newComment) {
          queryClient.setQueryData<HubCommentDto[]>([COMMENTS_QUERY_KEY, postId], (prev) => [...(prev ?? []), newComment]);
        }
        updateCommentCount(postId, 1);
        toast.success(copy.commentPublished);
      } catch (error) {
        reportCommentError("addComment", error, { context: { postId }, fallback: copy.publishError });
      }
    },
    [eventId, queryClient, draftsRef, replyingToRef, markSent, updateCommentCount]
  );

  const toggleCommentReaction = useCallback(
    async (postId: string, commentId: string, emoji: string) => {
      if (!eventId) return;

      queryClient.setQueryData<HubCommentDto[]>([COMMENTS_QUERY_KEY, postId], (prev) =>
        (prev ?? []).map((comment) => (comment.id === commentId ? applyCommentReaction(comment, emoji) : comment))
      );

      try {
        await feedRepo.toggleCommentReaction(eventId, postId, commentId, emoji);
      } catch (error) {
        void queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY, postId] });
        reportCommentError("toggleCommentReaction", error, { context: { commentId, emoji, postId }, fallback: copy.reactionError });
      }
    },
    [eventId, queryClient]
  );

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      if (!eventId) return;

      const previous = queryClient.getQueryData<HubCommentDto[]>([COMMENTS_QUERY_KEY, postId]) ?? [];
      const remaining = previous.filter((comment) => comment.id !== commentId);
      if (remaining.length === previous.length) return;

      queryClient.setQueryData<HubCommentDto[]>([COMMENTS_QUERY_KEY, postId], remaining);
      updateCommentCount(postId, -1);

      try {
        await feedRepo.deleteComment(eventId, postId, commentId);
        toast.success(copy.commentRemoved);
      } catch (error) {
        queryClient.setQueryData<HubCommentDto[]>([COMMENTS_QUERY_KEY, postId], previous);
        updateCommentCount(postId, 1);
        reportCommentError("deleteComment", error, { context: { commentId, postId }, fallback: copy.deleteError });
      }
    },
    [eventId, queryClient, updateCommentCount]
  );

  return {
    openComments: drafts.openComments,
    commentDrafts: drafts.commentDrafts,
    replyingTo: drafts.replyingTo,
    toggleComments: drafts.toggleComments,
    setCommentDraft: drafts.setCommentDraft,
    setReplyingTo: drafts.setReplyingTo,
    addComment,
    toggleCommentReaction,
    deleteComment,
  };
}
