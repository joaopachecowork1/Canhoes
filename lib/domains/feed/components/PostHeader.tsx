"use client";

import { ArrowDown, ArrowUp, Pin, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { PersonCromo } from "@/components/ui/person-cromo";
import { formatDateTime } from "./hubUtils";
import { formatMessage } from "@/lib/messages";
import { useRelativeTime } from "@/lib/postUtils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PostHeader;

const ICON_BUTTON_CLASS =
  "size-11 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]";

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
            className="size-11 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--danger)]"
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
  authorColor,
  createdAtUtc,
  postNumber,
  isAdmin,
  ...adminActions
}: Readonly<{
  authorName: string;
  authorColor?: string;
  createdAtUtc: string;
  postNumber: number;
  isAdmin?: boolean;
} & PostAdminActionsProps>) {
  const relativeTime = useRelativeTime(createdAtUtc);

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <PersonCromo name={authorName} color={authorColor} />

        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-bold text-[var(--text-primary)]">{authorName}</p>
            {adminActions.isPinned ? <Badge variant="secondary">{copy.pinned}</Badge> : null}
          </div>
          <p className="text-sm text-[var(--text-muted)]" title={formatDateTime(createdAtUtc)}>
            <span className="font-[family-name:var(--font-display)] font-bold text-[var(--color-text-secondary)]">{formatMessage(copy.number, { number: postNumber })}</span>
            {" · "}
            {relativeTime}
          </p>
        </div>
      </div>

      {isAdmin ? <PostAdminActions {...adminActions} /> : null}
    </div>
  );
}
