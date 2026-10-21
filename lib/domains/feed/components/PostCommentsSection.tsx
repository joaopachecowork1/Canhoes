"use client";

import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";

import type { EventFeedPostFullDto } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const LazyHubPostComments = dynamic(
  () => import("./HubPostComments").then((module) => ({ default: module.HubPostComments })),
  { loading: () => null, ssr: false },
);

export type PostCommentsSectionProps = {
  post: EventFeedPostFullDto;
  openComments: boolean;
  commentDraft: string;
  replyingToId: string | null;
  currentUserId?: string | null;
  currentUserName: string;
  currentUserImage?: string | null;
  eventId: string;
  onAddComment: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCommentDraftChange: (postId: string, text: string) => void;
  onToggleComments: (postId: string) => void;
  setReplyingTo: (postId: string, commentId: string | null) => void;
};

/** A conversa recolhível por baixo de um post; desloca-se para a vista quando aberta. */
export function PostCommentsSection({ post, openComments, ...commentProps }: Readonly<PostCommentsSectionProps>) {
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
        openComments ? "mt-2 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
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
