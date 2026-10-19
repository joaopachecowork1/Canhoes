"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import messages from "@/messages/pt.json";

import { UserAvatar } from "./UserAvatar";

const copy = messages.feed.CommentForm;

export const getCommentInputId = (postId: string) => `comment-input-${postId}`;

/** The reply box under a thread; when answering a comment it says whom. */
export function CommentForm({
  currentUserImage,
  currentUserName,
  draft,
  isReplying,
  onCancelReply,
  onDraftChange,
  onSubmit,
  postId,
  replyingToName,
}: Readonly<{
  currentUserImage?: string | null;
  currentUserName: string;
  draft: string;
  isReplying: boolean;
  onCancelReply: () => void;
  onDraftChange: (text: string) => void;
  onSubmit: () => void;
  postId: string;
  replyingToName: string | null;
}>) {
  return (
    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/50 rounded-b-[1.25rem] flex gap-3 p-4 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-2">
      <UserAvatar name={currentUserName} image={currentUserImage} className="mt-1 bg-[var(--bg-surface)]" />

      <div className="min-w-0 flex-1 space-y-2">
        {replyingToName ? (
          <div className="flex items-center justify-between bg-[var(--moss)]/10 border border-[var(--moss)]/20 text-[var(--moss-glow)] text-xs px-3 py-2 rounded-lg mb-2">
            <span className="truncate">
              {copy.replyingTo} <span className="font-semibold">{replyingToName}</span>
            </span>
            <button
              type="button"
              onClick={onCancelReply}
              aria-label={copy.cancelReply}
              className="text-[var(--moss-glow)] hover:text-[var(--text-primary)] p-1 rounded-full hover:bg-[var(--moss)]/20 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        <Textarea
          id={getCommentInputId(postId)}
          value={draft}
          onChange={(event) => onDraftChange(event.target.value)}
          placeholder={isReplying ? copy.replyPlaceholder : messages.feed.HubPostComments.placeholder}
          className="min-h-[72px] resize-none text-sm border-[var(--border-paper)] bg-[var(--bg-surface)] placeholder:text-[var(--text-muted)] rounded-xl"
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onDraftChange("")} disabled={!draft}>
            {copy.clear}
          </Button>
          <Button type="button" size="sm" onClick={onSubmit} disabled={!draft.trim()}>
            {messages.feed.HubPostComments.submit}
          </Button>
        </div>
      </div>
    </div>
  );
}
