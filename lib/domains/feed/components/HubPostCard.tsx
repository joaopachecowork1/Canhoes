"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MessageSquare } from "lucide-react";

import { BlurFade } from "@/components/animations/BlurFade";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { EventFeedPostFullDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/messages";
import { HEART_REACTION } from "@/lib/reactions";
import messages from "@/messages/pt.json";

import { getPostMediaUrls } from "./hubUtils";
import { ImageLightbox } from "./ImageLightbox";
import { PostHeader } from "./PostHeader";
import { PostText } from "./PostText";
import { PostVoteBar } from "./PostVoteBar";

const copy = messages.feed.HubPostCard;

const LazyHubPostComments = dynamic(
  () => import("./HubPostComments").then((module) => ({ default: module.HubPostComments })),
  {
    loading: () => null,
    ssr: false,
  }
);

const LazyMediaCarousel = dynamic(
  () => import("./MediaCarousel").then((module) => ({ default: module.MediaCarousel })),
  {
    loading: () => <FeedMediaFallback />,
    ssr: false,
  }
);

const LazyPollBox = dynamic(
  () => import("./PollBox").then((module) => ({ default: module.PollBox })),
  {
    loading: () => <FeedPollFallback />,
    ssr: false,
  }
);

interface HubPostCardProps {
  post: EventFeedPostFullDto;
  index: number;
  eventId: string;
  isAdmin: boolean;
  openComments: boolean;
  commentDraft: string;
  replyingToId: string | null;
  currentUserId?: string | null;
  currentUserName: string;
  currentUserImage?: string | null;
  onToggleReaction: (postId: string, emoji: string) => void;
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
}

type PostCommentsSectionProps = Pick<
  HubPostCardProps,
  | "commentDraft"
  | "currentUserId"
  | "currentUserImage"
  | "currentUserName"
  | "eventId"
  | "onAddComment"
  | "onCommentDraftChange"
  | "onDeleteComment"
  | "onToggleComments"
  | "openComments"
  | "post"
  | "replyingToId"
  | "setReplyingTo"
>;

function CommentToggleButton({ count, isOpen, onToggle }: Readonly<{ count: number; isOpen: boolean; onToggle: () => void }>) {
  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
        isOpen
          ? "bg-[var(--moss)]/12 text-[var(--moss-glow)]"
          : "text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
      )}
      onClick={onToggle}
      aria-label={isOpen ? copy.closeComments : formatMessage(copy.commentCount, { count })}
    >
      <MessageSquare className="h-4 w-4" />
      <span className="tabular-nums">{count}</span>
    </button>
  );
}

/** The collapsible thread under a post; it scrolls into view when opened. */
function PostCommentsSection({ post, openComments, ...commentProps }: Readonly<PostCommentsSectionProps>) {
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openComments && commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openComments]);

  return (
    <div
      ref={commentsRef}
      className={cn(
        "grid w-full transition duration-200 ease-out",
        openComments ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
      )}
    >
      <div className="overflow-hidden">
        <LazyHubPostComments
          postId={post.id}
          postAuthorName={post.authorName}
          commentCount={post.commentCount}
          openComments={openComments}
          {...commentProps}
        />
      </div>
    </div>
  );
}

function useLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const handleOpen = (imageIndex: number) => {
    setIndex(imageIndex);
    setIsOpen(true);
  };

  return { isOpen, index, handleOpen, handleClose: () => setIsOpen(false) };
}

function HubPostCardComponent({
  post,
  index,
  isAdmin,
  onToggleReaction,
  onToggleDownvote,
  onVotePoll,
  onAdminPin,
  onAdminMovePinned,
  onAdminDelete,
  ...commentProps
}: Readonly<HubPostCardProps>) {
  const lightbox = useLightbox();
  const resolvedMediaUrls = getPostMediaUrls(post);

  const handleUpvote = useCallback(() => {
    onToggleReaction(post.id, HEART_REACTION);
  }, [post.id, onToggleReaction]);

  const handleDownvote = useCallback(() => {
    onToggleDownvote(post.id);
  }, [post.id, onToggleDownvote]);

  return (
    <BlurFade delay={index * 50}>
      <Card className="overflow-hidden rounded-[var(--radius-lg-token)] border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-card)] text-[var(--color-text-primary)]">
        <CardHeader className="px-4 py-4 pb-2 sm:px-5">
          <PostHeader
            authorName={post.authorName}
            authorColor={post.authorColor}
            createdAtUtc={post.createdAtUtc}
            postNumber={post.postNumber}
            isPinned={post.isPinned}
            isAdmin={isAdmin}
            onAdminPin={() => onAdminPin(post.id)}
            onAdminMoveUp={() => onAdminMovePinned(post.id, "up")}
            onAdminMoveDown={() => onAdminMovePinned(post.id, "down")}
            onAdminDelete={() => onAdminDelete(post.id)}
          />
        </CardHeader>

        <CardContent className="space-y-3 px-4 pb-2 pt-2 sm:px-5">
          <PostText text={post.text} />
          {resolvedMediaUrls.length > 0 ? (
            <LazyMediaCarousel
              urls={resolvedMediaUrls}
              aspect="video"
              onImageClick={lightbox.handleOpen}
              authorName={post.authorName}
              isPriority={index < 2}
            />
          ) : null}
          {post.poll ? <LazyPollBox poll={post.poll} onVote={(optionId) => onVotePoll(post.id, optionId)} /> : null}
        </CardContent>

        <CardFooter className="flex flex-col items-stretch gap-2 bg-transparent px-4 py-3 sm:px-5">
          <div className="flex flex-row items-center justify-between w-full">
            <PostVoteBar
              isUpvoted={post.likedByMe}
              isDownvoted={post.downvotedByMe}
              onUpvote={handleUpvote}
              onDownvote={handleDownvote}
              score={post.likeCount - post.downvoteCount}
            />
            <CommentToggleButton
              count={post.commentCount}
              isOpen={commentProps.openComments}
              onToggle={() => commentProps.onToggleComments(post.id)}
            />
          </div>
          <PostCommentsSection post={post} {...commentProps} />
        </CardFooter>
      </Card>

      <ImageLightbox
        images={resolvedMediaUrls}
        initialIndex={lightbox.index}
        open={lightbox.isOpen}
        onClose={lightbox.handleClose}
        authorName={post.authorName}
        createdAtUtc={post.createdAtUtc}
      />
    </BlurFade>
  );
}

function FeedMediaFallback() {
  return <div className="skeleton-shimmer h-64 w-full rounded-[var(--radius-md-token)]" />;
}

function FeedPollFallback() {
  return <div className="skeleton-shimmer h-32 w-full rounded-[var(--radius-md-token)]" />;
}

export const HubPostCard = memo(HubPostCardComponent);
HubPostCard.displayName = "HubPostCard";
