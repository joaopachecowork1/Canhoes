"use client";

import { memo, useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { MessageSquare } from "lucide-react";

import { BlurFade } from "@/components/animations/BlurFade";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { EventFeedPostFullDto, EventGatheringRsvpStatus } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { formatMessage } from "@/lib/messages";
import { HEART_REACTION } from "@/lib/reactions";
import messages from "@/messages/pt.json";

import { GatheringBox } from "./GatheringBox";

import { getPostMediaUrls } from "./hubUtils";
import { ImageLightbox } from "./ImageLightbox";
import { PostCommentsSection } from "./PostCommentsSection";
import { PostHeader } from "./PostHeader";
import { PostText } from "./PostText";
import { PostVoteBar } from "./PostVoteBar";

const copy = messages.feed.HubPostCard;

const LazyMediaCarousel = dynamic(
  () => import("./MediaCarousel").then((module) => ({ default: module.MediaCarousel })),
  {
    loading: () => <FeedMediaFallback />,
    ssr: false,
  },
);

const LazyPollBox = dynamic(() => import("./PollBox").then((module) => ({ default: module.PollBox })), {
  loading: () => <FeedPollFallback />,
  ssr: false,
});

type GatheringCardActions = {
  onVoteDate: (gatheringId: string, optionId: string) => void;
  onConfirmDate: (gatheringId: string, dateText: string) => void;
  onRsvp: (gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => void;
};

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
  gatheringActions?: GatheringCardActions;
  setReplyingTo: (postId: string, commentId: string | null) => void;
}

/** O botão com a contagem que abre e fecha os comentários. */
function CommentToggleButton({
  count,
  isOpen,
  onToggle,
}: Readonly<{ count: number; isOpen: boolean; onToggle: () => void }>) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-all active:scale-95",
        isOpen
          ? "border-[var(--moss)]/60 bg-[var(--moss)]/20 text-[var(--moss-glow)] shadow-xs ring-1 ring-[var(--moss-glow)]/40"
          : "border-[var(--color-border-strong)] bg-[var(--color-bg-base)]/85 text-[var(--color-text-primary)]/80 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-veil)]/10 hover:text-[var(--color-text-primary)] shadow-xs backdrop-blur-md",
      )}
      onClick={onToggle}
      aria-label={isOpen ? copy.closeComments : formatMessage(copy.commentCount, { count })}
    >
      <MessageSquare className={cn("size-4 transition-transform", isOpen && "text-[var(--moss-glow)] scale-110")} />
      <span className="tabular-nums font-mono font-bold">{count}</span>
    </button>
  );
}

/** Estado do visualizador de imagens: se está aberto e em que imagem. */
function useLightbox() {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  const handleOpen = (imageIndex: number) => {
    setIndex(imageIndex);
    setIsOpen(true);
  };

  return { isOpen, index, handleOpen, handleClose: () => setIsOpen(false) };
}

function PostMainBody({
  post,
  index,
  isAdmin,
  lightbox,
  gatheringActions,
  onVotePoll,
}: {
  post: EventFeedPostFullDto;
  index: number;
  isAdmin: boolean;
  lightbox: ReturnType<typeof useLightbox>;
  gatheringActions?: GatheringCardActions;
  onVotePoll: (postId: string, optionId: string) => void;
}) {
  const resolvedMediaUrls = getPostMediaUrls(post);

  return (
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
      {post.gathering && gatheringActions ? (
        <GatheringBox
          gathering={post.gathering}
          isAdmin={isAdmin}
          onVoteDate={gatheringActions.onVoteDate}
          onConfirmDate={gatheringActions.onConfirmDate}
          onRsvp={gatheringActions.onRsvp}
        />
      ) : null}
    </CardContent>
  );
}

/** Um post do feed: cabeçalho, texto, imagens, sondagem, votos e comentários. */
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
  gatheringActions,
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
      <Card className="overflow-hidden rounded-[var(--radius-lg-token)] border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-paper)] text-[var(--color-text-primary)] transition-shadow">
        <CardHeader className="px-4 py-4 pb-2 sm:px-5">
          <PostHeader
            authorName={post.authorName}
            authorColor={post.authorColor}
            createdAtUtc={post.createdAtUtc}
            isPinned={post.isPinned}
            isAdmin={isAdmin}
            onAdminPin={() => onAdminPin(post.id)}
            onAdminMoveUp={() => onAdminMovePinned(post.id, "up")}
            onAdminMoveDown={() => onAdminMovePinned(post.id, "down")}
            onAdminDelete={() => onAdminDelete(post.id)}
          />
        </CardHeader>

        <PostMainBody
          post={post}
          index={index}
          isAdmin={isAdmin}
          lightbox={lightbox}
          gatheringActions={gatheringActions}
          onVotePoll={onVotePoll}
        />

        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-[var(--color-border)]/25 bg-[var(--color-veil)]/[0.02] px-4 py-3 sm:px-5">
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

/** Marcador de posição enquanto as imagens carregam. */
function FeedMediaFallback() {
  return <div className="skeleton-shimmer h-64 w-full rounded-[var(--radius-md-token)]" />;
}

/** Marcador de posição enquanto a sondagem carrega. */
function FeedPollFallback() {
  return <div className="skeleton-shimmer h-32 w-full rounded-[var(--radius-md-token)]" />;
}

export const HubPostCard = memo(HubPostCardComponent);
HubPostCard.displayName = "HubPostCard";
