"use client";

import { Pin, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, initials } from "./hubUtils";

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
  onAdminDelete,
}: Readonly<{
  authorName: string;
  createdAtUtc: string;
  isPinned?: boolean;
  isAdmin?: boolean;
  onAdminPin?: () => void;
  onAdminDelete?: () => void;
}>) {
  const accent = accentForName(authorName);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-bold"
          style={{
            background: `linear-gradient(180deg, ${accent}18, rgba(255,255,255,0.72))`,
            borderColor: `${accent}55`,
            color: accent,
          }}
        >
          {initials(authorName)}
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
              {authorName}
            </p>
            {isPinned ? <Badge variant="secondary">Fixado</Badge> : null}
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            {formatDateTime(createdAtUtc)}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full p-0 text-[var(--color-brown)]"
            onClick={onAdminPin}
            title="Fixar ou desafixar"
          >
            <Pin className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 rounded-full p-0 text-[var(--color-danger)]"
            onClick={onAdminDelete}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
