import { useCallback, useEffect, useRef, useState } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { HubCommentDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { feedRepo } from "@/lib/repositories/feedRepo";
import messages from "@/messages/pt.json";

import { updatePostInFeed, type FeedInfiniteData } from "./feedInfiniteData";
import { applyCommentReaction, changeCommentCount } from "./feedPostUpdates";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.feed.useHubFeedComments;

type UseHubFeedCommentsArgs = {
  eventId: string | null;
  queryClient: QueryClient;
};

/** Regista o erro e mostra um toast com a mensagem do servidor ou o texto de recurso. */
function reportCommentError(
  action: string,
  error: unknown,
  { context, fallback }: Readonly<{ context: Record<string, unknown>; fallback: string }>,
) {
  logFrontendError(`HubFeed.${action}`, error, context);
  toast.error(getErrorMessage(error, fallback));
}

// Estado local por publicação; `eventId` identifica a que evento pertence.
type CommentDraftState = {
  eventId: string | null;
  openComments: Record<string, boolean>;
  commentDrafts: Record<string, string>;
  replyingTo: Record<string, string | null>;
};

const emptyDrafts = (eventId: string | null): CommentDraftState => ({
  eventId,
  openComments: {},
  commentDrafts: {},
  replyingTo: {},
});

/**
 * Por publicação: se os comentários estão abertos, a resposta por enviar e a que comentário responde.
 * O estado pertence a um evento: mudar de evento recomeça vazio, sem effect.
 */
function useCommentDrafts(eventId: string | null) {
  const [stored, setStored] = useState<CommentDraftState>(() => emptyDrafts(eventId));
  const state = stored.eventId === eventId ? stored : emptyDrafts(eventId);

  // Os callbacks leem os rascunhos mais recentes sem serem recriados a cada tecla.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // Descarta o estado de outro evento antes de aplicar a mudança.
  const update = useCallback(
    (change: (current: CommentDraftState) => Partial<CommentDraftState>) =>
      setStored((previous) => {
        const current = previous.eventId === eventId ? previous : emptyDrafts(eventId);
        return { ...current, ...change(current) };
      }),
    [eventId],
  );

  const toggleComments = useCallback(
    (postId: string) =>
      update(({ openComments }) => ({ openComments: { ...openComments, [postId]: !openComments[postId] } })),
    [update],
  );
  const setCommentDraft = useCallback(
    (postId: string, draft: string) =>
      update(({ commentDrafts }) => ({ commentDrafts: { ...commentDrafts, [postId]: draft } })),
    [update],
  );
  const setReplyingTo = useCallback(
    (postId: string, commentId: string | null) =>
      update(({ replyingTo }) => ({ replyingTo: { ...replyingTo, [postId]: commentId } })),
    [update],
  );

  /** Depois de enviar uma resposta: limpa-a e mantém a conversa aberta para a mostrar. */
  const markSent = useCallback(
    (postId: string) =>
      update((current) => ({
        commentDrafts: { ...current.commentDrafts, [postId]: "" },
        replyingTo: { ...current.replyingTo, [postId]: null },
        openComments: { ...current.openComments, [postId]: true },
      })),
    [update],
  );

  return { ...state, stateRef, toggleComments, setCommentDraft, setReplyingTo, markSent };
}

/** Reage a um comentário de imediato e volta a pedir os comentários se o servidor recusar. */
function useToggleCommentReaction({ eventId, queryClient }: Readonly<UseHubFeedCommentsArgs>) {
  return useCallback(
    async (postId: string, commentId: string, emoji: string) => {
      if (!eventId) return;

      // Atualização otimista: a reação aparece já na cache dos comentários.
      queryClient.setQueryData<HubCommentDto[]>(queryKeys.hubComments(postId), (prev) =>
        (prev ?? []).map((comment) => (comment.id === commentId ? applyCommentReaction(comment, emoji) : comment)),
      );

      try {
        await feedRepo.toggleCommentReaction(eventId, postId, commentId, emoji);
      } catch (error) {
        // Rollback por refetch: em vez de guardar o estado anterior, volta a pedir os comentários ao servidor.
        void queryClient.invalidateQueries({ queryKey: queryKeys.hubComments(postId) });
        reportCommentError("toggleCommentReaction", error, {
          context: { commentId, emoji, postId },
          fallback: copy.reactionError,
        });
      }
    },
    [eventId, queryClient],
  );
}

/** Comentários das publicações do feed: conversas abertas, rascunhos de resposta e reagir/apagar otimistas com rollback em caso de falha. */
export function useHubFeedComments({ eventId, queryClient }: Readonly<UseHubFeedCommentsArgs>) {
  const drafts = useCommentDrafts(eventId);
  const { stateRef, markSent } = drafts;

  // Ajusta o contador de comentários da publicação na cache do feed (+1 ou -1).
  const updateCommentCount = useCallback(
    (postId: string, delta: 1 | -1) => {
      queryClient.setQueryData<FeedInfiniteData>(queryKeys.hubPosts(eventId), (feed) =>
        updatePostInFeed(feed, postId, (post) => changeCommentCount(post, delta)),
      );
    },
    [eventId, queryClient],
  );

  const addComment = useCallback(
    async (postId: string) => {
      if (!eventId) return;
      const text = (stateRef.current.commentDrafts[postId] ?? "").trim();
      if (!text) return;

      // Não é otimista: espera pelo servidor, porque o comentário novo precisa do id e dos dados reais.
      try {
        const newComment = await feedRepo.createComment(eventId, postId, {
          text,
          replyToId: stateRef.current.replyingTo[postId] || null,
        });
        markSent(postId);
        if (newComment) {
          queryClient.setQueryData<HubCommentDto[]>(queryKeys.hubComments(postId), (prev) => [
            ...(prev ?? []),
            newComment,
          ]);
        }
        updateCommentCount(postId, 1);
        toast.success(copy.commentPublished);
      } catch (error) {
        reportCommentError("addComment", error, { context: { postId }, fallback: copy.publishError });
      }
    },
    [eventId, queryClient, stateRef, markSent, updateCommentCount],
  );

  const toggleCommentReaction = useToggleCommentReaction({ eventId, queryClient });

  const deleteComment = useCallback(
    async (postId: string, commentId: string) => {
      if (!eventId) return;

      // Guarda a lista atual para o rollback; se o comentário nem está na cache, não há nada a apagar.
      const previous = queryClient.getQueryData<HubCommentDto[]>(queryKeys.hubComments(postId)) ?? [];
      const remaining = previous.filter((comment) => comment.id !== commentId);
      if (remaining.length === previous.length) return;

      // Remove já da lista e do contador, antes da resposta do servidor.
      queryClient.setQueryData<HubCommentDto[]>(queryKeys.hubComments(postId), remaining);
      updateCommentCount(postId, -1);

      try {
        await feedRepo.deleteComment(eventId, postId, commentId);
        toast.success(copy.commentRemoved);
      } catch (error) {
        // Rollback: repõe a lista e o contador como estavam.
        queryClient.setQueryData<HubCommentDto[]>(queryKeys.hubComments(postId), previous);
        updateCommentCount(postId, 1);
        reportCommentError("deleteComment", error, { context: { commentId, postId }, fallback: copy.deleteError });
      }
    },
    [eventId, queryClient, updateCommentCount],
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
