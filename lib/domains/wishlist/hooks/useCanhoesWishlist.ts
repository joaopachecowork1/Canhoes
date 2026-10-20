"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthContext";
import { useEventMembers } from "@/lib/domains/event/hooks/useEventMembers";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type { EventActiveContextDto, EventWishlistItemDto, PublicUserDto } from "@/lib/api/types";
import messages from "@/messages/pt.json";

import { groupWishlistItemsByUser, MIN_WISHLIST_TITLE_LENGTH, pickSelectedMemberId } from "../rules/wishlistRules";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.wishlist.useCanhoesWishlist;
const STALE_TIME_MS = 1000 * 60 * 2;

/** Campos do formulário de novo item da wishlist. */
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

/** Membros e itens da wishlist do evento, com os dados iniciais vindos do servidor. */
function useWishlistQueries(
  eventId: string | null,
  { initialMembers, initialWishlistItems }: UseCanhoesWishlistOptions,
) {
  const membersQuery = useEventMembers(eventId, initialMembers);

  const itemsQuery = useQuery({
    queryKey: queryKeys.wishlistItems(eventId),
    queryFn: () => eventRepo.getWishlist(eventId ?? "", 0, 1000).then((response) => response.items),
    enabled: !!eventId,
    staleTime: STALE_TIME_MS,
    // Os dados iniciais vêm do servidor e evitam um primeiro pedido.
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

/** Adicionar (com imagem opcional) e remover os teus itens. */
function useWishlistMutations(eventId: string | null) {
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<WishlistFormState>(EMPTY_WISHLIST_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const canSubmit = formState.title.trim().length >= MIN_WISHLIST_TITLE_LENGTH;

  /** Adiciona o item; resolve com o sucesso, para o formulário poder fechar. */
  const createWishlistItem = async () => {
    if (!canSubmit || !eventId) return false;

    setIsSaving(true);
    try {
      const createdItem = await eventRepo.createWishlistItem(eventId, {
        notes: formState.notes.trim() || null,
        title: formState.title.trim(),
        url: formState.url.trim() || null,
      });
      // O item existe a partir daqui: uma imagem que falhe não pode fazer uma nova tentativa criá-lo outra vez.
      const isImageMissing = formState.selectedFile
        ? await eventRepo.uploadWishlistImage(eventId, createdItem.id, formState.selectedFile).then(
            () => false,
            (uploadError) => {
              logFrontendError("CanhoesWishlist.uploadImage", uploadError);
              return true;
            },
          )
        : false;
      // Limpa o formulário e recarrega a lista antes do aviso final.
      setFormState(EMPTY_WISHLIST_FORM);
      await queryClient.invalidateQueries({ queryKey: queryKeys.wishlistItems(eventId) });
      if (isImageMissing) toast.warning(copy.imageUploadError);
      else toast.success(copy.itemAdded);
      return true;
    } catch (createError) {
      logFrontendError("CanhoesWishlist.handleCreate", createError);
      toast.error(getErrorMessage(createError, copy.saveError));
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Não é otimista: o item só sai da cache depois de o servidor confirmar.
  const deleteWishlistItem = async (wishlistItemId: string) => {
    if (!eventId) return;
    setDeletingItemId(wishlistItemId);

    try {
      await eventRepo.deleteWishlistItem(eventId, wishlistItemId);
      queryClient.setQueryData<EventWishlistItemDto[]>(queryKeys.wishlistItems(eventId), (previousItems) =>
        (previousItems ?? []).filter((item) => item.id !== wishlistItemId),
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
    eventId ? queryClient.invalidateQueries({ queryKey: queryKeys.wishlistItems(eventId) }) : Promise.resolve();

  return {
    formState,
    setFormState,
    isSaving,
    deletingItemId,
    canSubmit,
    createWishlistItem,
    deleteWishlistItem,
    retryLoading,
  };
}

/** Membros e itens da wishlist do evento, a lista do membro selecionado e adicionar ou remover os teus itens. */
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
