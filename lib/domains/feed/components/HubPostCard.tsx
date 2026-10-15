"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ArrowBigUp, ArrowBigDown, MessageSquare } from "lucide-react";

import { BlurFade } from "@/components/animations/BlurFade";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { EventFeedPostFullDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { parsePostText } from "@/lib/postUtils";

import { PostHeader } from "./PostHeader";
import { ImageLightbox } from "./ImageLightbox";
import { HEART_REACTION } from "@/lib/reactions";

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

function HubPostCardComponent({
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
}: Readonly<HubPostCardProps>) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openComments && commentsRef.current) {
      commentsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [openComments]);

  const resolvedMediaUrls = [...new Set([...(post.mediaUrls ?? []), post.mediaUrl].filter(Boolean))] as string[];

  const hasMedia = resolvedMediaUrls.length > 0;
  const parsedText = post.text?.trim() ? parsePostText(post.text) : null;
  const displayScore = (post.likeCount ?? 0) - (post.downvoteCount ?? 0);
  const commentCount = post.commentCount ?? 0;

  const handleImageClick = (imageIndex: number) => {
    setLightboxIndex(imageIndex);
    setLightboxOpen(true);
  };

  const handleUpvote = useCallback(() => {
    onToggleReaction(post.id, HEART_REACTION);
  }, [post.id, onToggleReaction]);

  const handleDownvote = useCallback(() => {
    onToggleDownvote(post.id);
  }, [post.id, onToggleDownvote]);

  return (
    <BlurFade delay={index * 50}>
      <Card className="border-x-0 border-t-0 border-b border-[var(--border-subtle)] bg-transparent shadow-none rounded-none text-[var(--color-text-primary)]">
        <CardHeader className="px-4 py-4 pb-2">
          <PostHeader
            authorName={post.authorName}
            createdAtUtc={post.createdAtUtc}
            isPinned={post.isPinned}
            isAdmin={isAdmin}
            onAdminPin={() => onAdminPin(post.id)}
            onAdminMoveUp={() => onAdminMovePinned(post.id, "up")}
            onAdminMoveDown={() => onAdminMovePinned(post.id, "down")}
            onAdminDelete={() => onAdminDelete(post.id)}
          />
        </CardHeader>

        <CardContent className="px-4 pt-2 pb-1 space-y-3">
          {parsedText ? (
            parsedText.title ? (
              <div className="space-y-1.5">
                <p className="post-title text-[var(--text-primary)]">{parsedText.title}</p>
                {parsedText.body ? (
                  <p className="post-body whitespace-pre-wrap break-words text-[var(--ink-secondary)]">
                    {parsedText.body}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="body-base whitespace-pre-wrap break-words text-[var(--text-primary)] leading-[1.6]">
                {post.text}
              </p>
            )
          ) : null}

          {hasMedia ? (
            <LazyMediaCarousel
              urls={resolvedMediaUrls}
              aspect="video"
              onImageClick={handleImageClick}
              authorName={post.authorName}
              isPriority={index < 2}
            />
          ) : null}

          {post.poll ? (
            <LazyPollBox
              poll={post.poll}
              onVote={(optionId) => onVotePoll(post.id, optionId)}
            />
          ) : null}
        </CardContent>

        <CardFooter className="px-4 py-3 bg-transparent flex flex-col items-stretch gap-2">
          <div className="flex flex-row items-center justify-between w-full">
            {/* Voting Bar */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleUpvote}
                className={cn(
                  "canhoes-tap flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  post.likedByMe
                    ? "bg-green-500/20 text-green-500 shadow-[0_0_0_1px_rgba(34,197,94,0.25)]"
                    : "text-[var(--text-muted)] hover:bg-green-500/10 hover:text-green-400"
                )}
                aria-label={post.likedByMe ? "Remover upvote" : "Upvote"}
              >
                <ArrowBigUp className={cn("h-5 w-5 transition-all", post.likedByMe && "fill-green-500 text-green-500")} />
              </button>

              <span
                className={cn(
                  "min-w-[2rem] text-center font-mono text-sm font-bold tabular-nums",
                  post.likedByMe
                    ? "text-green-500"
                    : post.downvotedByMe
                      ? "text-red-500"
                      : "text-[var(--ink-secondary)]"
                )}
              >
                {displayScore}
              </span>

              <button
                type="button"
                onClick={handleDownvote}
                className={cn(
                  "canhoes-tap flex h-9 w-9 items-center justify-center rounded-full transition-colors",
                  post.downvotedByMe
                    ? "bg-red-500/15 text-red-500 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]"
                    : "text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-400"
                )}
                aria-label={post.downvotedByMe ? "Remover downvote" : "Downvote"}
              >
                <ArrowBigDown className={cn("h-5 w-5 transition-all", post.downvotedByMe && "fill-red-500 text-red-500")} />
              </button>
            </div>

            {/* Comment Toggle */}
            <button
              type="button"
              className={cn(
                "canhoes-tap flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                openComments
                  ? "bg-[rgba(79,99,54,0.12)] text-[var(--moss)]"
                  : "text-[var(--ink-muted)] hover:bg-white/[0.04] hover:text-[var(--ink-primary)]"
              )}
              onClick={() => onToggleComments(post.id)}
              aria-label={openComments ? "Fechar comentários" : `${commentCount} comentários`}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="tabular-nums">{commentCount}</span>
            </button>
          </div>

          {/* Comments Section */}
          <div
            ref={commentsRef}
            className={`grid w-full transition-all duration-200 ease-out ${
              openComments ? "grid-rows-[1fr] opacity-100 mt-2" : "grid-rows-[0fr] opacity-0 mt-0"
            }`}
          >
            <div className="overflow-hidden">
              <LazyHubPostComments
                postId={post.id}
                postAuthorName={post.authorName}
                eventId={eventId}
                commentCount={commentCount}
                openComments={openComments}
                commentDraft={commentDraft}
                replyingToId={replyingToId}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserImage={currentUserImage}
                onToggleComments={onToggleComments}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onCommentDraftChange={onCommentDraftChange}
                setReplyingTo={setReplyingTo}
              />
            </div>
          </div>
        </CardFooter>
      </Card>

      <ImageLightbox
        images={resolvedMediaUrls}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
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
