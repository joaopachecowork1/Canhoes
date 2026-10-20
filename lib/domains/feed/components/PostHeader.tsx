"use client";

import { ArrowDown, ArrowUp, Ellipsis, Pin, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { PersonCromo } from "@/components/ui/person-cromo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatDateTime } from "./hubUtils";
import { formatMessage } from "@/lib/messages";
import { useRelativeTime } from "@/lib/postUtils";
import messages from "@/messages/pt.json";

const copy = messages.feed.PostHeader;

const MENU_ACTION_CLASS = "w-full justify-start gap-3";

type PostAdminActionsProps = {
  isPinned?: boolean;
  onAdminPin?: () => void;
  onAdminMoveUp?: () => void;
  onAdminMoveDown?: () => void;
  onAdminDelete?: () => void;
};

/** One button that opens the admin's actions on a post (pin, reorder pinned posts, delete) in a bottom sheet. */
function PostAdminActions({ isPinned, onAdminPin, onAdminMoveUp, onAdminMoveDown, onAdminDelete }: Readonly<PostAdminActionsProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const run = (action?: () => void) => () => {
    setIsOpen(false);
    action?.();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="size-11 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
        onClick={() => setIsOpen(true)}
        aria-label={copy.menuLabel}
      >
        <Ellipsis className="h-5 w-5" aria-hidden />
      </Button>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" aria-describedby={undefined}>
          <SheetHeader>
            <SheetTitle>{copy.menuTitle}</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]">
            <Button variant="outline" className={MENU_ACTION_CLASS} onClick={run(onAdminPin)}>
              <Pin className="h-5 w-5" aria-hidden />
              {isPinned ? copy.unpin : copy.pin}
            </Button>
            {isPinned ? (
              <>
                <Button variant="outline" className={MENU_ACTION_CLASS} onClick={run(onAdminMoveUp)}>
                  <ArrowUp className="h-5 w-5" aria-hidden />
                  {copy.moveUp}
                </Button>
                <Button variant="outline" className={MENU_ACTION_CLASS} onClick={run(onAdminMoveDown)}>
                  <ArrowDown className="h-5 w-5" aria-hidden />
                  {copy.moveDown}
                </Button>
              </>
            ) : null}
            <ConfirmDeleteAction
              onConfirm={run(onAdminDelete)}
              title={copy.deleteTitle}
              description={copy.deleteDescription}
              trigger={
                <Button variant="outline" className={`${MENU_ACTION_CLASS} text-[var(--danger)]`}>
                  <Trash2 className="h-5 w-5" aria-hidden />
                  {copy.deleteLabel}
                </Button>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
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
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-2">
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
