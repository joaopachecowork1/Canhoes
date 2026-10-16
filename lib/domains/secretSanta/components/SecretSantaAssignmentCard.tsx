import { User } from "lucide-react";
import Link from "next/link";

import type { EventWishlistItemDto } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.secretSanta.SecretSantaAssignmentCard;

export function SecretSantaAssignmentCard({
  assignedUserName,
  assignedWishlistItems,
  wishlistHref,
  wishlistLabel,
}: Readonly<{
  assignedUserName: string;
  assignedWishlistItems: EventWishlistItemDto[];
  wishlistHref: string;
  wishlistLabel: string;
}>) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--color-fire)]" />
          {messages.secretSanta.common.yourSecretSanta}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="canhoes-list-item space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--moss),var(--neon-cyan))] text-[var(--color-text-primary)] shadow-[var(--glow-green-sm)]">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-[var(--color-text-primary)]">{assignedUserName}</p>
              <p className="body-small text-[var(--color-text-muted)]">
                {formatCount(assignedWishlistItems.length, messages.common.item, messages.common.items)}
                {copy.inAssignedWishlist}
              </p>
            </div>
            <Badge variant="amber">{copy.secretBadge}</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={wishlistHref}>{wishlistLabel}</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
