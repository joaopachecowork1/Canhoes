import { Gift, Link as LinkIcon } from "lucide-react";

import type { EventWishlistItemDto } from "@/lib/api/types";
import { CanhoesMediaThumb } from "@/components/modules/canhoes/CanhoesModuleParts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AssignedWishlistPanel({
  assignedWishlistItems,
  assignedUserName,
}: Readonly<{
  assignedWishlistItems: EventWishlistItemDto[];
  assignedUserName: string;
}>) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[var(--color-fire)]" />
          Wishlist de {assignedUserName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignedWishlistItems.length === 0 ? (
          <p className="body-small text-[var(--color-text-muted)]">
            Ainda não há itens na wishlist. Diz ao teu amigo secreto para adicionar.
          </p>
        ) : (
          <div className="space-y-2">
            {assignedWishlistItems.map((wishlistItem) => (
              <div key={wishlistItem.id} className="canhoes-list-item flex gap-3 p-3">
                <CanhoesMediaThumb alt={wishlistItem.title} src={wishlistItem.imageUrl} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">{wishlistItem.title}</p>
                  {wishlistItem.notes ? (
                    <p className="body-small line-clamp-2 text-[var(--color-text-muted)]">{wishlistItem.notes}</p>
                  ) : null}
                  {wishlistItem.url ? (
                    <a href={wishlistItem.url} target="_blank" rel="noreferrer" className="canhoes-link inline-flex items-center gap-1 text-sm">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Ver produto
                    </a>
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
