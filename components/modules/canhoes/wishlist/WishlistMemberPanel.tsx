"use client";

import { Link as LinkIcon, Trash2 } from "lucide-react";

import {
  CanhoesMediaThumb,
} from "@/components/modules/canhoes/CanhoesModuleParts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import type { EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import { formatCount } from "@/lib/utils";

type WishlistMemberPanelProps = {
  deletingItemId: string | null;
  items: EventWishlistItemDto[];
  member: PublicUserDto;
  onDelete: (wishlistItemId: string) => Promise<void>;
  userId: string | null;
};

export function WishlistMemberPanel({
  deletingItemId,
  items,
  member,
  onDelete,
  userId,
}: WishlistMemberPanelProps) {
  const isCurrentUser = member.id === userId;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="truncate">{member.displayName || member.email || member.id}</span>
          {isCurrentUser ? <Badge variant="outline">tu</Badge> : null}
          {member.isAdmin && !isCurrentUser ? <Badge variant="outline">admin</Badge> : null}
          <span className="body-small ml-auto text-[var(--color-text-muted)]">
            {formatCount(items.length, "item", "itens")}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="py-4 text-center text-sm text-[var(--text-muted)]">Sem itens nesta wishlist.</p>
        ) : (
          <VirtualizedList
            items={items}
            getKey={(wishlistItem) => wishlistItem.id}
            estimateSize={() => 108}
            className="max-h-[50svh]"
            renderItem={(wishlistItem) => (
              <div className="canhoes-list-item flex gap-3 p-2.5">
                <CanhoesMediaThumb alt={wishlistItem.title} src={wishlistItem.imageUrl} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                    {wishlistItem.title}
                  </p>
                  {wishlistItem.notes ? (
                    <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{wishlistItem.notes}</p>
                  ) : null}
                  {wishlistItem.url ? (
                    <a
                      href={wishlistItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="canhoes-link mt-1.5 inline-flex items-center gap-1 text-xs"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      Abrir link
                    </a>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {new Date(wishlistItem.updatedAtUtc).toLocaleDateString()}
                  </p>

                  {isCurrentUser ? (
                    <ConfirmDeleteAction
                      onConfirm={() => void onDelete(wishlistItem.id)}
                      title="Remover da Wishlist?"
                      description="Vais remover este item da tua wishlist. Esta ação não pode ser desfeita."
                      trigger={
                        <button
                          type="button"
                          disabled={deletingItemId === wishlistItem.id}
                          className="canhoes-tap rounded-full border border-transparent p-2 text-[var(--color-text-muted)] hover:border-[var(--color-danger)]/30 hover:text-[var(--color-danger)] disabled:opacity-50"
                          aria-label="Apagar item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      }
                    />
                  ) : null}
                </div>
              </div>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
