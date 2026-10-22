"use client";

import { Link as LinkIcon, Trash2 } from "lucide-react";

import { CanhoesMediaThumb } from "@/lib/domains/event/components/CanhoesMediaThumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import { formatCount } from "@/lib/utils";
import { getMemberLabel } from "../rules/wishlistRules";
import messages from "@/messages/pt.json";

const copy = messages.wishlist.WishlistMemberPanel;

type WishlistMemberPanelProps = {
  deletingItemId: string | null;
  items: EventWishlistItemDto[];
  member: PublicUserDto;
  onDelete: (wishlistItemId: string) => Promise<void>;
  userId: string | null;
};

/** A wishlist de um membro, só de leitura. */
export function WishlistMemberPanel({ deletingItemId, items, member, onDelete, userId }: WishlistMemberPanelProps) {
  const isCurrentUser = member.id === userId;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="truncate">{getMemberLabel(member)}</span>
          {isCurrentUser ? <Badge variant="outline">{copy.youBadge}</Badge> : null}
          {member.isAdmin && !isCurrentUser ? <Badge variant="outline">{copy.adminBadge}</Badge> : null}
          <span className="body-small ml-auto text-[var(--color-text-muted)]">
            {formatCount(items.length, messages.common.item, messages.common.items)}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">{copy.empty}</p>
        ) : (
          <div className="space-y-2">
            {items.map((wishlistItem) => (
              <div key={wishlistItem.id} className="flex gap-3 p-2.5">
                <CanhoesMediaThumb alt={wishlistItem.title} src={wishlistItem.imageUrl} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-semibold text-[var(--color-text-primary)]">
                    {wishlistItem.title}
                  </p>
                  {wishlistItem.notes ? (
                    <p className="line-clamp-2 text-sm text-[var(--color-text-muted)]">{wishlistItem.notes}</p>
                  ) : null}
                  {wishlistItem.url && /^https?:\/\//i.test(wishlistItem.url) ? (
                    <a
                      href={wishlistItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--moss-glow)] underline-offset-4 hover:underline"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {copy.openLink}
                    </a>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(wishlistItem.updatedAtUtc).toLocaleDateString("pt-PT")}
                  </p>

                  {isCurrentUser ? (
                    <ConfirmDeleteAction
                      onConfirm={() => void onDelete(wishlistItem.id)}
                      title={copy.deleteTitle}
                      description={copy.deleteDescription}
                      trigger={
                        <button
                          type="button"
                          disabled={deletingItemId === wishlistItem.id}
                          className="rounded-full border border-transparent p-2 text-[var(--color-text-muted)] hover:border-[var(--color-danger)]/30 hover:text-[var(--color-danger)] disabled:opacity-50"
                          aria-label={copy.deleteLabel}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      }
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
