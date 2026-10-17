import { Gift } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import messages from "@/messages/pt.json";

const copy = messages.secretSanta.WishlistPreviewCard;

export function WishlistPreviewCard({
  myWishlistItemCount,
  wishlistHref,
  wishlistLabel,
}: Readonly<{
  myWishlistItemCount: number;
  wishlistHref: string;
  wishlistLabel: string;
}>) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-4 w-4 text-[var(--color-fire)]" />
          {copy.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="p-4">
          <p>{copy.yourWishlist}</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--color-text-primary)]">{myWishlistItemCount}</p>
          <p className="body-small mt-1 text-[var(--color-text-muted)]">
            {copy.hint}
          </p>
        </div>
        <Button className="w-full" asChild>
          <Link href={wishlistHref}>{wishlistLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
