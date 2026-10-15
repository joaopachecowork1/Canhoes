"use client";

import { memo } from "react";
import { ScrollText } from "lucide-react";

import { SectionBoundary } from "@/components/ui/section-boundary";
import { EmptyState } from "@/components/ui/empty-state";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { feedCopy } from "@/lib/canhoesCopy";
import type { EventFeedPostFullDto } from "@/lib/api/types";

import { FeedLoadMore } from "./FeedLoadMore";
import { HubPostCard } from "./HubPostCard";

type HubFeedListProps = {
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
  sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
};

const POST_KEY = (post: EventFeedPostFullDto) => post.id;
const POST_SIZE = () => 220;

const HubFeedListItem = memo(function HubFeedListItem({
  post, index, eventId, isAdmin, openComments, commentDraft, replyingToId,
  currentUserId, currentUserName, currentUserImage,
  onToggleReaction, onToggleDownvote, onToggleComments, onVotePoll,
  onAddComment, onDeleteComment, onCommentDraftChange, onAdminPin, onAdminMovePinned, onAdminDelete, setReplyingTo
}: {
  post: EventFeedPostFullDto; index: number; eventId: string; isAdmin: boolean;
  openComments: boolean; commentDraft: string; replyingToId: string | null;
  currentUserId: string | null; currentUserName: string; currentUserImage: string | null;
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
}) {
  return (
    <div className="mb-3">
      <SectionBoundary
        key={post.id}
        title="Erro no post"
        description="Ocorreu um erro ao renderizar este post."
      >
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
          onToggleReaction={onToggleReaction}
          onToggleDownvote={onToggleDownvote}
          onToggleComments={onToggleComments}
          onVotePoll={onVotePoll}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onCommentDraftChange={onCommentDraftChange}
          onAdminPin={onAdminPin}
          onAdminMovePinned={onAdminMovePinned}
          onAdminDelete={onAdminDelete}
          setReplyingTo={setReplyingTo}
        />
      </SectionBoundary>
    </div>
  );
});

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
  onToggleReaction,
  onToggleDownvote,
  onToggleComments,
  onVotePoll,
  onAddComment,
  onDeleteComment,
  onCommentDraftChange,
  onAdminPin,
  onAdminMovePinned,
  onAdminDelete,
  setReplyingTo,
  sentinelRef,
}: Readonly<HubFeedListProps>) {
  return (
    <div className="animate-fade-in flex flex-col">

                {posts.length > 0 ? (
            <VirtualizedList
              items={posts}
              overscan={4}
              getKey={POST_KEY}
              estimateSize={POST_SIZE}
              useWindowScroll={true}
              renderItem={(post, index) => (
                <HubFeedListItem
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
                  onToggleReaction={onToggleReaction}
                  onToggleDownvote={onToggleDownvote}
                  onToggleComments={onToggleComments}
                  onVotePoll={onVotePoll}
                  onAddComment={onAddComment}
                  onDeleteComment={onDeleteComment}
                  onCommentDraftChange={onCommentDraftChange}
                  onAdminPin={onAdminPin}
                  onAdminMovePinned={onAdminMovePinned}
                  onAdminDelete={onAdminDelete}
                  setReplyingTo={setReplyingTo}
                />
              )}
            />
        ) : (
          <EmptyState
            className="py-10"
            icon={ScrollText}
            title={feedCopy.empty.title}
            description={feedCopy.empty.description}
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
