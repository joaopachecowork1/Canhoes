"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMessage } from "@/lib/messages";
import { feedRepo } from "@/lib/repositories/feedRepo";
import messages from "@/messages/pt.json";

import { CommentForm, getCommentInputId } from "./CommentForm";
import { CommentThreadItem } from "./CommentThreadItem";
import { buildCommentTree, flattenCommentTree } from "./hubPostCommentTree";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.feed.HubPostComments;

function getCommentCountLabel(count: number) {
  if (count === 0) return copy.noComments;
  return formatMessage(count === 1 ? copy.commentCountOne : copy.commentCountOther, { count });
}

type HubPostCommentsProps = {
  postId: string;
  postAuthorName: string;
  eventId: string;
  commentCount: number;
  openComments: boolean;
  commentDraft: string;
  replyingToId: string | null;
  currentUserId?: string | null;
  currentUserName: string;
  currentUserImage?: string | null;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCommentDraftChange: (postId: string, text: string) => void;
  setReplyingTo: (postId: string, commentId: string | null) => void;
};

/** Loads a post's comments while its thread is open, oldest first, nested under their parents. */
function usePostComments(eventId: string, postId: string, isOpen: boolean) {
  const { data: fetchedComments } = useQuery({
    queryKey: queryKeys.hubComments(postId),
    queryFn: () => feedRepo.getComments(eventId, postId),
    enabled: isOpen,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const loadedComments = (fetchedComments ?? []).filter(Boolean);
  const sortedComments = [...loadedComments].sort((left, right) =>
    String(left.createdAtUtc).localeCompare(String(right.createdAtUtc))
  );

  return { loadedComments, displayComments: flattenCommentTree(buildCommentTree(sortedComments)) };
}

function CommentsHeader({ commentCount, onClose }: Readonly<{ commentCount: number; onClose: () => void }>) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
        <MessageSquare className="h-4 w-4 text-[var(--moss)]" />
        <span className="font-medium">{getCommentCountLabel(commentCount)}</span>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 rounded-full px-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--color-veil)]/6"
        onClick={onClose}
        aria-label={messages.feed.HubPostCard.closeComments}
      >
        {messages.common.close}
      </Button>
    </div>
  );
}

export function HubPostComments({
  postId,
  postAuthorName,
  eventId,
  commentCount,
  openComments,
  commentDraft,
  replyingToId,
  currentUserId,
  currentUserName,
  currentUserImage,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onCommentDraftChange,
  setReplyingTo,
}: Readonly<HubPostCommentsProps>) {
  const { loadedComments, displayComments } = usePostComments(eventId, postId, openComments);

  if (!openComments) return null;

  const replyingToComment = replyingToId
    ? loadedComments.find((comment) => comment.id === replyingToId)
    : null;

  const handleReply = (commentId: string) => {
    setReplyingTo(postId, commentId);
    // Wait for the reply banner to render before moving focus to the box.
    setTimeout(() => document.getElementById(getCommentInputId(postId))?.focus({ preventScroll: false }), 50);
  };

  return (
    <section className="bg-[var(--bg-paper)] rounded-[1.25rem] p-4 sm:p-5 border border-[var(--border-paper)] shadow-md">
      <CommentsHeader commentCount={commentCount} onClose={() => onToggleComments(postId)} />

      <div className="space-y-0 relative">
        {displayComments.length === 0 ? (
          <div className="rounded-xl px-4 py-6 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-deep)] border border-[var(--color-veil)]/4">
            {copy.empty}
          </div>
        ) : (
          <div className="space-y-2">
            {displayComments.map((comment) => (
              <CommentThreadItem
                key={comment.id}
                comment={comment}
                avatarImage={comment.userName === currentUserName ? currentUserImage : null}
                isOwnComment={Boolean(currentUserId) && comment.userId === currentUserId}
                isPostAuthor={comment.userName === postAuthorName}
                onDelete={() => onDeleteComment(postId, comment.id)}
                onReply={() => handleReply(comment.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CommentForm
        currentUserImage={currentUserImage}
        currentUserName={currentUserName}
        draft={commentDraft}
        isReplying={Boolean(replyingToId)}
        onCancelReply={() => setReplyingTo(postId, null)}
        onDraftChange={(text) => onCommentDraftChange(postId, text)}
        onSubmit={() => onAddComment(postId)}
        postId={postId}
        replyingToName={replyingToComment?.userName ?? null}
      />
    </section>
  );
}
