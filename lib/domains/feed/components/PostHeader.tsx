"use client";

import { ArrowDown, ArrowUp, Pin, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { formatDateTime, initials } from "./hubUtils";
import { useRelativeTime } from "@/lib/postUtils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PostHeader;

const AVATAR_ACCENTS = [
  "var(--color-moss)",
  "var(--color-brown)",
  "var(--color-beige-dark)",
  "var(--color-title-light)",
];

function accentForName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index++) {
    hash = (hash * 31 + name.charCodeAt(index)) & 0xffff;
  }

  return AVATAR_ACCENTS[Math.abs(hash) % AVATAR_ACCENTS.length];
}

const ICON_BUTTON_CLASS =
  "h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]";

type PostAdminActionsProps = {
  isPinned?: boolean;
  onAdminPin?: () => void;
  onAdminMoveUp?: () => void;
  onAdminMoveDown?: () => void;
  onAdminDelete?: () => void;
};

/** Pin, reorder (pinned posts only) and delete buttons for admins. */
function PostAdminActions({ isPinned, onAdminPin, onAdminMoveUp, onAdminMoveDown, onAdminDelete }: Readonly<PostAdminActionsProps>) {
  return (
    <div className="flex items-center gap-1">
      {isPinned ? (
        <>
          <Button variant="ghost" size="sm" className={ICON_BUTTON_CLASS} onClick={onAdminMoveUp} aria-label={copy.moveUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className={ICON_BUTTON_CLASS} onClick={onAdminMoveDown} aria-label={copy.moveDown}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </>
      ) : null}
      <Button variant="ghost" size="sm" className={ICON_BUTTON_CLASS} onClick={onAdminPin} aria-label={isPinned ? copy.unpin : copy.pin}>
        <Pin className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDeleteAction
        onConfirm={onAdminDelete || (() => {})}
        title={copy.deleteTitle}
        description={copy.deleteDescription}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--danger)]"
            aria-label={copy.deleteLabel}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        }
      />
    </div>
  );
}

export function PostHeader({
  authorName,
  createdAtUtc,
  isAdmin,
  ...adminActions
}: Readonly<{
  authorName: string;
  createdAtUtc: string;
  isAdmin?: boolean;
} & PostAdminActionsProps>) {
  const accent = accentForName(authorName);
  const relativeTime = useRelativeTime(createdAtUtc);

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-bold"
          style={{ color: accent }}
        >
          {initials(authorName)}
        </div>

        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{authorName}</p>
            {adminActions.isPinned ? <Badge variant="secondary">{copy.pinned}</Badge> : null}
          </div>
          <p className="text-xs text-[var(--text-muted)]" title={formatDateTime(createdAtUtc)}>
            {relativeTime}
          </p>
        </div>
      </div>

      {isAdmin ? <PostAdminActions {...adminActions} /> : null}
    </div>
  );
}
