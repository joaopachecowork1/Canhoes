"use client";

import { ArrowDown, ArrowUp, Pin, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { formatDateTime, initials } from "./hubUtils";
import { useRelativeTime } from "@/lib/postUtils";

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

export function PostHeader({
  authorName,
  createdAtUtc,
  isPinned,
  isAdmin,
  onAdminPin,
  onAdminMoveUp,
  onAdminMoveDown,
  onAdminDelete,
}: Readonly<{
  authorName: string;
  createdAtUtc: string;
  isPinned?: boolean;
  isAdmin?: boolean;
  onAdminPin?: () => void;
  onAdminMoveUp?: () => void;
  onAdminMoveDown?: () => void;
  onAdminDelete?: () => void;
}>) {
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
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {authorName}
            </p>
            {isPinned ? <Badge variant="secondary">Fixado</Badge> : null}
          </div>
          <p className="text-xs text-[var(--text-muted)]" title={formatDateTime(createdAtUtc)}>
            {relativeTime}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="flex items-center gap-1">
          {isPinned ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                onClick={onAdminMoveUp}
                aria-label="Subir post fixado"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
                onClick={onAdminMoveDown}
                aria-label="Descer post fixado"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
            onClick={onAdminPin}
            aria-label={isPinned ? "Desafixar post" : "Fixar post"}
          >
            <Pin className="h-3.5 w-3.5" />
          </Button>
          <ConfirmDeleteAction
            onConfirm={onAdminDelete || (() => {})}
            title="Eliminar Publicação?"
            description="Esta publicação vai ser removida permanentemente do Mural Social. Esta ação não pode ser desfeita."
            trigger={
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 rounded-full p-0 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--danger)]"
                aria-label="Eliminar post"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            }
          />
        </div>
      ) : null}
    </div>
  );
}
