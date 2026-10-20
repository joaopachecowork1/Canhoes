"use client";

import { Inbox } from "lucide-react";
import { useState } from "react";

import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { FormSheet } from "@/lib/domains/event/components/FormSheet";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";
import { useAuth } from "@/components/providers/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { EventActiveContextDto, EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import { WishlistForm } from "./WishlistForm";
import { WishlistMemberPanel } from "./WishlistMemberPanel";
import { useCanhoesWishlist } from "../hooks/useCanhoesWishlist";
import { getMemberLabel } from "../rules/wishlistRules";
import messages from "@/messages/pt.json";

const copy = messages.wishlist.CanhoesWishlistModule;

function WishlistLoadingState() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="space-y-2 rounded-[var(--radius-lg-token)] border border-[var(--color-veil)]/12 bg-[var(--color-panel)]/72 p-4">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 rounded-[var(--radius-md-token)] border border-[var(--color-veil)]/10 p-3">
              <Skeleton className="h-14 w-14 rounded-[var(--radius-md-token)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded" />
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-3 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type CanhoesWishlistModuleProps = {
  initialContext?: EventActiveContextDto | null;
  initialMembers?: PublicUserDto[];
  initialWishlistItems?: EventWishlistItemDto[];
};

type Wishlist = ReturnType<typeof useCanhoesWishlist>;

/** Tabs per member and the selected member's list. */
function WishlistMembers({ wishlist, userId }: Readonly<{ wishlist: Wishlist; userId: string | null }>) {
  return (
    <div className="space-y-3">
      <CompactSegmentTabs
        activeId={wishlist.selectedMember?.id ?? ""}
        items={wishlist.members.map((member) => ({
          id: member.id,
          label: getMemberLabel(member),
          badge: String((wishlist.wishlistByUser.get(member.id) ?? []).length),
        }))}
        onSelect={wishlist.setSelectedMemberId}
      />

      {wishlist.selectedMember ? (
        <WishlistMemberPanel
          deletingItemId={wishlist.deletingItemId}
          items={wishlist.selectedMemberItems}
          member={wishlist.selectedMember}
          onDelete={wishlist.deleteWishlistItem}
          userId={userId}
        />
      ) : null}
    </div>
  );
}

function WishlistContent({ wishlist, userId }: Readonly<{ wishlist: Wishlist; userId: string | null }>) {
  if (wishlist.errorMessage) {
    return (
      <ErrorAlert
        title={copy.loadErrorTitle}
        description={wishlist.errorMessage}
        actionLabel={messages.common.retry}
        onAction={() => void wishlist.retryLoading()}
      />
    );
  }
  if (wishlist.members.length > 0) return <WishlistMembers wishlist={wishlist} userId={userId} />;
  if (wishlist.isLoading) return <WishlistLoadingState />;
  return <EmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyDescription} />;
}

/** Wishlist page: your own list to edit and every other member's list to read. */
export function CanhoesWishlistModule({
  initialContext,
  initialMembers,
  initialWishlistItems,
}: CanhoesWishlistModuleProps) {
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const wishlist = useCanhoesWishlist({
    initialContext,
    initialMembers,
    initialWishlistItems,
  });

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        module="wishlist"
        title={copy.title}
        description={copy.description}
        badgeLabel={formatCount(wishlist.wishlistItems.length, messages.common.item, messages.common.items)}
        badgeVariant="secondary"
      />

      <FormSheet isOpen={isFormOpen} onOpenChange={setIsFormOpen} title={messages.wishlist.WishlistForm.title} triggerLabel={copy.addItem}>
        <WishlistForm
          formState={wishlist.formState}
          isSaving={wishlist.isSaving}
          canSubmit={wishlist.canSubmit}
          onChange={(update) => wishlist.setFormState((current) => ({ ...current, ...update }))}
          onSubmit={() => void wishlist.createWishlistItem().then((isSaved) => setIsFormOpen(!isSaved))}
        />
      </FormSheet>

      <WishlistContent wishlist={wishlist} userId={user?.id ?? null} />
    </div>
  );
}
