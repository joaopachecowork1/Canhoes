"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthContext";
import { useEventOverview } from "@/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type {
  EventActiveContextDto,
  EventWishlistItemDto,
  PublicUserDto,
} from "@/lib/api/types";

const WISHLIST_ITEMS_QUERY_KEY = "wishlistItems";

function groupWishlistItemsByUser(items: EventWishlistItemDto[]) {
  const wishlistByUser = new Map<string, EventWishlistItemDto[]>();

  for (const wishlistItem of items) {
    const itemsForUser = wishlistByUser.get(wishlistItem.userId) ?? [];
    itemsForUser.push(wishlistItem);
    wishlistByUser.set(wishlistItem.userId, itemsForUser);
  }

  for (const itemsForUser of wishlistByUser.values()) {
    itemsForUser.sort((leftItem, rightItem) =>
      (rightItem.updatedAtUtc || "").localeCompare(leftItem.updatedAtUtc || "")
    );
  }

  return wishlistByUser;
}

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

export function useCanhoesWishlist({
  initialContext,
  initialMembers,
  initialWishlistItems,
}: UseCanhoesWishlistOptions) {
  const { user } = useAuth();
  const { event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryClient = useQueryClient();

  const {
    data: members = [],
    isLoading: isMembersLoading,
    error: membersError,
  } = useQuery({
    queryKey: ["wishlistMembers", eventId],
    queryFn: () => eventRepo.getMembers(eventId!).then((response) => (
      Array.isArray(response) ? response : []
    )),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialMembers,
  });

  const {
    data: wishlistItems = [],
    isLoading: isWishlistLoading,
    error: wishlistError,
  } = useQuery({
    queryKey: [WISHLIST_ITEMS_QUERY_KEY, eventId],
    queryFn: () => eventRepo.getWishlist(eventId!, 0, 1000).then((response) => response.items),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialWishlistItems,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formState, setFormState] = useState<WishlistFormState>(EMPTY_WISHLIST_FORM);

  const wishlistByUser = useMemo(() => groupWishlistItemsByUser(wishlistItems), [wishlistItems]);

  useEffect(() => {
    if (members.length === 0) {
      setSelectedMemberId(null);
      return;
    }

    setSelectedMemberId((currentMemberId) => {
      if (currentMemberId && members.some((member) => member.id === currentMemberId)) {
        return currentMemberId;
      }
      if (user?.id && members.some((member) => member.id === user.id)) {
        return user.id;
      }
      return members[0].id;
    });
  }, [members, user?.id]);

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? null;
  const selectedMemberItems = selectedMember
    ? wishlistByUser.get(selectedMember.id) ?? []
    : [];
  const error = membersError || wishlistError;

  const createWishlistItem = async () => {
    if (formState.title.trim().length < 2 || !eventId) return;

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
      toast.success("Item adicionado");
    } catch (createError) {
      const message = getErrorMessage(
        createError,
        "Não foi possível guardar este item da wishlist."
      );
      logFrontendError("CanhoesWishlist.handleCreate", createError);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteWishlistItem = async (wishlistItemId: string) => {
    if (!eventId) return;
    setDeletingItemId(wishlistItemId);

    try {
      await eventRepo.deleteWishlistItem(eventId, wishlistItemId);
      queryClient.setQueryData<EventWishlistItemDto[]>(
        [WISHLIST_ITEMS_QUERY_KEY, eventId],
        (previousItems) => (previousItems ?? []).filter((item) => item.id !== wishlistItemId)
      );
      toast.success("Item removido");
    } catch (deleteError) {
      const message = getErrorMessage(
        deleteError,
        "Não foi possível remover este item da wishlist."
      );
      logFrontendError("CanhoesWishlist.handleDelete", deleteError, { wishlistItemId });
      toast.error(message);
    } finally {
      setDeletingItemId(null);
    }
  };

  return {
    eventId,
    members,
    wishlistItems,
    selectedMember,
    selectedMemberItems,
    wishlistByUser,
    formState,
    isSaving,
    deletingItemId,
    isLoading: isMembersLoading || isWishlistLoading,
    errorMessage: error
      ? getErrorMessage(error, "Não foi possível carregar a wishlist desta edição.")
      : null,
    canSubmit: formState.title.trim().length >= 2,
    setFormState,
    setSelectedMemberId,
    createWishlistItem,
    deleteWishlistItem,
    retryLoading: () => (
      eventId
        ? queryClient.invalidateQueries({ queryKey: [WISHLIST_ITEMS_QUERY_KEY, eventId] })
        : Promise.resolve()
    ),
  };
}
