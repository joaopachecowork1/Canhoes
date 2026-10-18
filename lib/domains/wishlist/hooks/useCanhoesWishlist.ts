"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthContext";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type { EventActiveContextDto, EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import messages from "@/messages/pt.json";

import { groupWishlistItemsByUser, MIN_WISHLIST_TITLE_LENGTH, pickSelectedMemberId } from "../rules/wishlistRules";

const copy = messages.wishlist.useCanhoesWishlist;
const WISHLIST_ITEMS_QUERY_KEY = "wishlistItems";
const STALE_TIME_MS = 1000 * 60 * 2;

export type WishlistFormState = {
  title: string;
  url: string;
  notes: string;
  selectedFile: File | null;
};

const EMPTY_WISHLIST_FORM: WishlistFormState = {
  title: "",
  url: "",
  notes: "",
  selectedFile: null,
};

type UseCanhoesWishlistOptions = {
  initialContext?: EventActiveContextDto | null;
  initialMembers?: PublicUserDto[];
  initialWishlistItems?: EventWishlistItemDto[];
};

function useWishlistQueries(eventId: string | null, { initialMembers, initialWishlistItems }: UseCanhoesWishlistOptions) {
  const membersQuery = useQuery({
    queryKey: ["wishlistMembers", eventId],
    queryFn: () => eventRepo.getMembers(eventId ?? "").then((response) => (Array.isArray(response) ? response : [])),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialMembers,
  });

  const itemsQuery = useQuery({
    queryKey: [WISHLIST_ITEMS_QUERY_KEY, eventId],
    queryFn: () => eventRepo.getWishlist(eventId ?? "", 0, 1000).then((response) => response.items),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    initialData: initialWishlistItems,
  });

  const error = membersQuery.error || itemsQuery.error;
  return {
    members: membersQuery.data ?? [],
    wishlistItems: itemsQuery.data ?? [],
    isLoading: membersQuery.isLoading || itemsQuery.isLoading,
    errorMessage: error ? getErrorMessage(error, copy.loadError) : null,
  };
}

/** Adding (with an optional image) and removing your own items. */
function useWishlistMutations(eventId: string | null) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<WishlistFormState>(EMPTY_WISHLIST_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const canSubmit = formState.title.trim().length >= MIN_WISHLIST_TITLE_LENGTH;

  const createWishlistItem = async () => {
    if (!canSubmit || !eventId) return;

    setIsSaving(true);
    try {
      const createdItem = await eventRepo.createWishlistItem(eventId, {
        notes: formState.notes.trim() || null,
        title: formState.title.trim(),
        url: formState.url.trim() || null,
      });
      if (formState.selectedFile) {
        await eventRepo.uploadWishlistImage(eventId, createdItem.id, formState.selectedFile);
      }
      setFormState(EMPTY_WISHLIST_FORM);
      await queryClient.invalidateQueries({ queryKey: [WISHLIST_ITEMS_QUERY_KEY, eventId] });
      toast.success(copy.itemAdded);
    } catch (createError) {
      logFrontendError("CanhoesWishlist.handleCreate", createError);
      toast.error(getErrorMessage(createError, copy.saveError));
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWishlistItem = async (wishlistItemId: string) => {
    if (!eventId) return;
    setDeletingItemId(wishlistItemId);

    try {
      await eventRepo.deleteWishlistItem(eventId, wishlistItemId);
      queryClient.setQueryData<EventWishlistItemDto[]>([WISHLIST_ITEMS_QUERY_KEY, eventId], (previousItems) =>
        (previousItems ?? []).filter((item) => item.id !== wishlistItemId)
      );
      toast.success(copy.itemRemoved);
    } catch (deleteError) {
      logFrontendError("CanhoesWishlist.handleDelete", deleteError, { wishlistItemId });
      toast.error(getErrorMessage(deleteError, copy.deleteError));
    } finally {
      setDeletingItemId(null);
    }
  };

  const retryLoading = () =>
    eventId ? queryClient.invalidateQueries({ queryKey: [WISHLIST_ITEMS_QUERY_KEY, eventId] }) : Promise.resolve();

  return { formState, setFormState, isSaving, deletingItemId, canSubmit, createWishlistItem, deleteWishlistItem, retryLoading };
}

/** Members and wishlist items of the event, the selected member's list, and adding or removing your own items. */
export function useCanhoesWishlist(options: UseCanhoesWishlistOptions) {
  const { user } = useAuth();
  const { event } = useEventOverview(options.initialContext);
  const eventId = event?.id ?? null;
  const queries = useWishlistQueries(eventId, options);
  const mutations = useWishlistMutations(eventId);
  const [pickedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const wishlistByUser = useMemo(() => groupWishlistItemsByUser(queries.wishlistItems), [queries.wishlistItems]);
  const selectedMemberId = pickSelectedMemberId(pickedMemberId, queries.members, user?.id);
  const selectedMember = queries.members.find((member) => member.id === selectedMemberId) ?? null;

  return {
    ...queries,
    ...mutations,
    eventId,
    selectedMember,
    selectedMemberItems: selectedMember ? (wishlistByUser.get(selectedMember.id) ?? []) : [],
    wishlistByUser,
    setSelectedMemberId,
  };
}
