import { User } from "lucide-react";

import type { EventWishlistItemDto } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { SecretSantaAssignmentCard } from "./SecretSantaAssignmentCard";
import { SecretSantaLoadingState } from "./SecretSantaLoadingState";
import messages from "@/messages/pt.json";

const copy = messages.secretSanta.SecretSantaContent;

export function SecretSantaContent({
  assignedUserName,
  assignedWishlistItems,
  errorMessage,
  hasAssignment,
  hasDraw,
  isBusy,
  onRetry,
  wishlistHref,
  wishlistLabel,
}: Readonly<{
  assignedUserName?: string;
  assignedWishlistItems: EventWishlistItemDto[];
  errorMessage: string | null;
  hasAssignment: boolean;
  hasDraw: boolean;
  isBusy: boolean;
  onRetry: () => void;
  wishlistHref: string;
  wishlistLabel: string;
}>) {
  if (isBusy) {
    return <SecretSantaLoadingState />;
  }

  if (errorMessage) {
    return (
      <Card>
        <CardContent className="py-6">
          <ErrorAlert
            title={copy.loadErrorTitle}
            description={errorMessage}
            actionLabel={messages.common.retry}
            onAction={onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  if (hasAssignment && assignedUserName) {
    return (
      <SecretSantaAssignmentCard
        assignedUserName={assignedUserName}
        assignedWishlistItems={assignedWishlistItems}
        wishlistHref={wishlistHref}
        wishlistLabel={wishlistLabel}
      />
    );
  }

  const statusMessage = hasDraw ? copy.drawWithoutAssignment : copy.noDraw;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <User className="h-4 w-4 text-[var(--color-fire)]" />
          {messages.secretSanta.common.yourSecretSanta}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="canhoes-list-item p-4">
          <p className="body-small text-[var(--color-text-muted)]">{statusMessage}</p>
        </div>
      </CardContent>
    </Card>
  );
}
