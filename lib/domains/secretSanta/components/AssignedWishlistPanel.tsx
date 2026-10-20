import { Gift, Link as LinkIcon } from "lucide-react";

import type { EventWishlistItemDto } from "@/lib/api/types";
import { CanhoesMediaThumb } from "@/lib/domains/event/components/CanhoesMediaThumb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.secretSanta.AssignedWishlistPanel;

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
          <Gift className="h-4 w-4 text-[var(--person-amber)]" />
          {formatMessage(copy.title, { name: assignedUserName })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignedWishlistItems.length === 0 ? (
          <p className="body-small text-[var(--color-text-muted)]">{copy.empty}</p>
        ) : (
          <div className="space-y-2">
            {assignedWishlistItems.map((wishlistItem) => (
              <div key={wishlistItem.id} className="flex gap-3 p-3">
                <CanhoesMediaThumb alt={wishlistItem.title} src={wishlistItem.imageUrl} />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-semibold text-[var(--color-text-primary)]">{wishlistItem.title}</p>
                  {wishlistItem.notes ? (
                    <p className="body-small line-clamp-2 text-[var(--color-text-muted)]">{wishlistItem.notes}</p>
                  ) : null}
                  {wishlistItem.url ? (
                    <a
                      href={wishlistItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm"
                    >
                      <LinkIcon className="h-3.5 w-3.5" />
                      {copy.viewProduct}
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
