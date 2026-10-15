"use client";

import { Gift, Inbox } from "lucide-react";

import {
  CanhoesModuleHeader,
} from "@/components/modules/canhoes/CanhoesModuleParts";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";
import { useAuth } from "@/components/providers/AuthContext";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/utils";
import type { EventActiveContextDto, EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import { WishlistForm } from "./WishlistForm";
import { WishlistMemberPanel } from "./WishlistMemberPanel";
import { useCanhoesWishlist } from "./useCanhoesWishlist";

function WishlistLoadingState() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-full" />
        ))}
      </div>
      <div className="space-y-2 rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(22,28,15,0.72)] p-4">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-3 rounded-[var(--radius-md-token)] border border-[rgba(255,255,255,0.1)] p-3">
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

/** Wishlist page: your own list to edit and every other member's list to read. */
export function CanhoesWishlistModule({
  initialContext,
  initialMembers,
  initialWishlistItems,
}: CanhoesWishlistModuleProps) {
  const { user } = useAuth();
  const wishlist = useCanhoesWishlist({
    initialContext,
    initialMembers,
    initialWishlistItems,
  });
  const isInitialLoading = wishlist.isLoading && wishlist.members.length === 0;

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Gift}
        title="Wishlist"
        description="Toda a gente vê a wishlist de toda a gente. Só tu vês o teu amigo secreto."
        badgeLabel={formatCount(wishlist.wishlistItems.length, "item", "itens")}
        badgeVariant="secondary"
      />

      <WishlistForm
        formState={wishlist.formState}
        isSaving={wishlist.isSaving}
        canSubmit={wishlist.canSubmit}
        onChange={(update) => wishlist.setFormState((current) => ({ ...current, ...update }))}
        onSubmit={() => void wishlist.createWishlistItem()}
      />

      {wishlist.errorMessage ? (
        <ErrorAlert
          title="Erro ao carregar wishlist"
          description={wishlist.errorMessage}
          actionLabel="Tentar novamente"
          onAction={() => void wishlist.retryLoading()}
        />
      ) : null}

      {isInitialLoading ? <WishlistLoadingState /> : null}

      {!wishlist.errorMessage && wishlist.members.length === 0 && !isInitialLoading ? (
        <EmptyState icon={Inbox} title="Sem membros" description="Ainda não há membros na wishlist." />
      ) : null}

      {!wishlist.errorMessage && wishlist.members.length > 0 ? (
        <div className="space-y-3">
          <CompactSegmentTabs
            activeId={wishlist.selectedMember?.id ?? ""}
            items={wishlist.members.map((member) => ({
              id: member.id,
              label: member.displayName || member.email || member.id,
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
              userId={user?.id ?? null}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
