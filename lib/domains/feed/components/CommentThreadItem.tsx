"use client";

import { Reply, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import messages from "@/messages/pt.json";

import { formatDateTime } from "./hubUtils";
import type { DisplayComment } from "./hubPostCommentTree";
import { UserAvatar } from "./UserAvatar";

const copy = messages.feed.CommentThreadItem;
const INDENT_PX = 32;
const GUTTER_PX = 12;
const BRANCH_PX = 16;

function ThreadLines({ indentLevel, offset }: Readonly<{ indentLevel: number; offset: number }>) {
  if (indentLevel === 0) return null;
  const left = `${offset - BRANCH_PX}px`;
  return (
    <>
      <div className="absolute top-0 bottom-0 w-px bg-[var(--border-subtle)]" style={{ left }} />
      <div className="absolute top-[28px] h-px bg-[var(--border-subtle)]" style={{ left, width: `${BRANCH_PX}px` }} />
    </>
  );
}

/** One comment in the thread, indented under the one it answers. */
export function CommentThreadItem({
  avatarImage,
  comment,
  isOwnComment,
  isPostAuthor,
  onDelete,
  onReply,
}: Readonly<{
  avatarImage: string | null | undefined;
  comment: DisplayComment;
  isOwnComment: boolean;
  isPostAuthor: boolean;
  onDelete: () => void;
  onReply: () => void;
}>) {
  const offset = comment.indentLevel * INDENT_PX + GUTTER_PX;

  return (
    <article style={{ paddingLeft: `${offset}px` }} className="group relative flex gap-3 pr-3 py-3 transition-colors hover:bg-[var(--color-veil)]/2">
      <ThreadLines indentLevel={comment.indentLevel} offset={offset} />

      <div className="relative flex flex-col items-center">
        <UserAvatar name={comment.userName} image={avatarImage} className="bg-[var(--bg-deep)]" />
        {comment.hasChildren ? <div className="absolute top-8 bottom-[-12px] w-px bg-[var(--border-subtle)]" /> : null}
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{comment.userName}</span>
          {isPostAuthor ? (
            <Badge
              variant="outline"
              className="h-4 min-w-4 border-[var(--moss)]/30 bg-[var(--moss)]/10 px-1 text-xs font-bold uppercase tracking-[0.1em] text-[var(--moss-glow)]"
            >
              {copy.authorBadge}
            </Badge>
          ) : null}
          <span className="text-xs text-[var(--text-muted)]">{`· ${formatDateTime(comment.createdAtUtc)}`}</span>
        </div>

        <p className="mt-1 whitespace-pre-wrap break-words text-base leading-relaxed text-[var(--text-primary)]">{comment.text}</p>

        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded px-2 py-1 -ml-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--moss-glow)] hover:bg-[var(--moss)]/10"
            aria-label={copy.reply}
            onClick={onReply}
          >
            <Reply className="h-3.5 w-3.5" />
            {copy.reply}
          </button>

          {isOwnComment ? (
            <ConfirmDeleteAction
              onConfirm={onDelete}
              title={copy.deleteTitle}
              description={copy.deleteDescription}
              trigger={
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded px-2 py-1 -mr-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={copy.deleteLabel}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {copy.delete}
                </button>
              }
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}
