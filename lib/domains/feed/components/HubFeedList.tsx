"use client";

import { memo } from "react";
import { ScrollText } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";
import type { EventFeedPostFullDto, EventGatheringRsvpStatus } from "@/lib/api/types";

import { FeedLoadMore } from "./FeedLoadMore";
import { HubPostCard } from "./HubPostCard";
import messages from "@/messages/pt.json";

type FeedPostCallbacks = {
  onToggleReaction: (postId: string, emoji: string, e?: React.MouseEvent) => void;
  onToggleDownvote: (postId: string) => void;
  onToggleComments: (postId: string) => void;
  onVotePoll: (postId: string, optionId: string) => void;
  onAddComment: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCommentDraftChange: (postId: string, text: string) => void;
  onAdminPin: (postId: string) => void;
  onAdminMovePinned: (postId: string, direction: "up" | "down") => void;
  onAdminDelete: (postId: string) => void;
  setReplyingTo: (postId: string, commentId: string | null) => void;
  onVoteGatheringDate?: (postId: string, gatheringId: string, optionId: string) => void;
  onConfirmGatheringDate?: (postId: string, gatheringId: string, dateText: string) => void;
  onGatheringRsvp?: (postId: string, gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => void;
};

type HubFeedListProps = FeedPostCallbacks & {
  posts: EventFeedPostFullDto[];
  remainingPostsCount: number;
  eventId: string;
  isAdmin: boolean;
  hasMore: boolean;
  isFetchingNextPage: boolean;
  currentUserId: string | null;
  currentUserImage: string | null;
  currentUserName: string;
  openComments: Record<string, boolean>;
  commentDrafts: Record<string, string>;
  replyingTo: Record<string, string | null>;
  onLoadMore: () => void;
  sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
};

/** Um post da lista; memoizado para que só re-renderize quando os seus próprios dados mudam. */
const HubFeedListItem = memo(function HubFeedListItem({
  post,
  index,
  eventId,
  isAdmin,
  openComments,
  commentDraft,
  replyingToId,
  currentUserId,
  currentUserName,
  currentUserImage,
  callbacks,
}: {
  post: EventFeedPostFullDto;
  index: number;
  eventId: string;
  isAdmin: boolean;
  openComments: boolean;
  commentDraft: string;
  replyingToId: string | null;
  currentUserId: string | null;
  currentUserName: string;
  currentUserImage: string | null;
  callbacks: FeedPostCallbacks;
}) {
  const gatheringActions =
    callbacks.onVoteGatheringDate && callbacks.onConfirmGatheringDate && callbacks.onGatheringRsvp
      ? {
          onVoteDate: (gatheringId: string, optionId: string) =>
            callbacks.onVoteGatheringDate!(post.id, gatheringId, optionId),
          onConfirmDate: (gatheringId: string, dateText: string) =>
            callbacks.onConfirmGatheringDate!(post.id, gatheringId, dateText),
          onRsvp: (gatheringId: string, status: EventGatheringRsvpStatus, note?: string) =>
            callbacks.onGatheringRsvp!(post.id, gatheringId, status, note),
        }
      : undefined;

  return (
    <div className="mb-3">
      <HubPostCard
        post={post}
        index={index}
        eventId={eventId}
        isAdmin={isAdmin}
        openComments={openComments}
        commentDraft={commentDraft}
        replyingToId={replyingToId}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserImage={currentUserImage}
        onToggleReaction={callbacks.onToggleReaction}
        onToggleDownvote={callbacks.onToggleDownvote}
        onToggleComments={callbacks.onToggleComments}
        onVotePoll={callbacks.onVotePoll}
        onAddComment={callbacks.onAddComment}
        onDeleteComment={callbacks.onDeleteComment}
        onCommentDraftChange={callbacks.onCommentDraftChange}
        onAdminPin={callbacks.onAdminPin}
        onAdminMovePinned={callbacks.onAdminMovePinned}
        onAdminDelete={callbacks.onAdminDelete}
        gatheringActions={gatheringActions}
        setReplyingTo={callbacks.setReplyingTo}
      />
    </div>
  );
});

/** A lista de posts do feed, com estado vazio e botão/sentinela de "carregar mais". */
export const HubFeedList = memo(function HubFeedList({
  posts,
  remainingPostsCount,
  eventId,
  isAdmin,
  hasMore,
  isFetchingNextPage,
  currentUserId,
  currentUserImage,
  currentUserName,
  openComments,
  commentDrafts,
  replyingTo,
  onLoadMore,
  sentinelRef,
  ...callbacks
}: Readonly<HubFeedListProps>) {
  return (
    <div className="animate-fade-in flex flex-col">
      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post, index) => (
            <HubFeedListItem
              key={post.id}
              post={post}
              index={index}
              eventId={eventId}
              isAdmin={isAdmin}
              openComments={openComments[post.id] ?? false}
              commentDraft={commentDrafts[post.id] ?? ""}
              replyingToId={replyingTo[post.id] ?? null}
              currentUserId={currentUserId}
              currentUserName={currentUserName}
              currentUserImage={currentUserImage}
              callbacks={callbacks}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          className="py-10"
          icon={ScrollText}
          title={messages.feed.HubFeedList.emptyTitle}
          description={messages.feed.HubFeedList.emptyDescription}
          tone="social"
        />
      )}

      <FeedLoadMore
        hasMore={hasMore}
        isFetchingNextPage={isFetchingNextPage}
        remainingCount={remainingPostsCount}
        onLoadMore={onLoadMore}
        sentinelRef={sentinelRef}
      />
    </div>
  );
});
