"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Gift, Inbox, Link as LinkIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  CanhoesFileTrigger,
  CanhoesMediaThumb,
  CanhoesModuleHeader,
} from "@/components/modules/canhoes/CanhoesModuleParts";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";
import { useAuth } from "@/components/providers/AuthContext";
import { useEventOverview } from "@/hooks/useEventOverview";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { eventRepo } from "@/lib/repositories/eventRepo";
import type { EventActiveContextDto, PublicUserDto, EventWishlistItemDto } from "@/lib/api/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { formatCount } from "@/lib/utils";

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

export function CanhoesWishlistModule({ initialContext, initialMembers, initialWishlistItems: initialWishlist }: {
    initialContext?: EventActiveContextDto | null;
    initialMembers?: PublicUserDto[];
    initialWishlistItems?: EventWishlistItemDto[];
}) {
  const { user } = useAuth();
  const { event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryClient = useQueryClient();

  const { data: memberList = [], isLoading: isMembersLoading, error: membersError } = useQuery({
    queryKey: ["wishlistMembers", eventId],
    queryFn: () => eventRepo.getMembers(eventId!).then(r => Array.isArray(r) ? r : []),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialMembers,
  });

  const { data: wishlistItems = [], isLoading: isWishlistLoading, error: wishlistError } = useQuery({
    queryKey: ["wishlistItems", eventId],
    queryFn: () => eventRepo.getWishlist(eventId!, 0, 1000).then(r => r.items),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialWishlist,
  });

  const isLoading = isMembersLoading || isWishlistLoading;
  const errorMessage = (membersError || wishlistError)
    ? getErrorMessage(membersError || wishlistError, "Não foi possível carregar a wishlist desta edição.")
    : null;

  const [isSaving, setIsSaving] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [formState, setFormState] = useState({
    title: "",
    url: "",
    notes: "",
    selectedFile: null as File | null,
  });

  const canSubmit = formState.title.trim().length >= 2;
  const wishlistByUser = useMemo(() => groupWishlistItemsByUser(wishlistItems), [wishlistItems]);

  useEffect(() => {
    if (memberList.length === 0) {
      setSelectedMemberId(null);
      return;
    }

    setSelectedMemberId((current) => {
      if (current && memberList.some((member) => member.id === current)) return current;
      if (user?.id && memberList.some((member) => member.id === user.id)) return user.id;
      return memberList[0].id;
    });
  }, [memberList, user?.id]);

  const selectedMember = memberList.find((member) => member.id === selectedMemberId) ?? null;
  const selectedMemberItems = selectedMember ? wishlistByUser.get(selectedMember.id) ?? [] : [];

  const handleCreate = async () => {
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

      setFormState({ title: "", url: "", notes: "", selectedFile: null });
      await queryClient.invalidateQueries({ queryKey: ["wishlistItems", eventId] });
      toast.success("Item adicionado");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Não foi possível guardar este item da wishlist."
      );
      logFrontendError("CanhoesWishlist.handleCreate", error);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (wishlistItemId: string) => {
    if (!eventId) return;
    setDeletingItemId(wishlistItemId);

    try {
      await eventRepo.deleteWishlistItem(eventId, wishlistItemId);
      queryClient.setQueryData<EventWishlistItemDto[]>(["wishlistItems", eventId], (prev) =>
        (prev ?? []).filter((item) => item.id !== wishlistItemId)
      );
      toast.success("Item removido");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Não foi possível remover este item da wishlist."
      );
      logFrontendError("CanhoesWishlist.handleDelete", error, { wishlistItemId });
      toast.error(message);
    } finally {
      setDeletingItemId(null);
    }
  };

  const isInitialLoading = isLoading && memberList.length === 0;

  let wishlistContent: JSX.Element | null = null;
  if (!errorMessage) {
    if (memberList.length === 0 && !isInitialLoading) {
      wishlistContent = (
        <EmptyState icon={Inbox} title="Sem membros" description="Ainda não há membros na wishlist." />
      );
    } else if (memberList.length > 0) {
      wishlistContent = (
        <div className="space-y-3">
          <CompactSegmentTabs
            activeId={selectedMember?.id ?? ""}
            items={memberList.map((member) => ({
              id: member.id,
              label: member.displayName || member.email || member.id,
              badge: String((wishlistByUser.get(member.id) ?? []).length),
            }))}
            onSelect={setSelectedMemberId}
          />

          {selectedMember ? (
            <WishlistMemberPanel
              deletingItemId={deletingItemId}
              items={selectedMemberItems}
              member={selectedMember}
              onDelete={handleDelete}
              userId={user?.id ?? null}
            />
          ) : null}
        </div>
      );
    }
  }

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Gift}
        title="Wishlist"
        description="Toda a gente vê a wishlist de toda a gente. Só tu vês o teu amigo secreto."
        badgeLabel={formatCount(wishlistItems.length, "item", "itens")}
        badgeVariant="secondary"
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Adicionar item à tua wishlist</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="wishlist-title-input" className="canhoes-field-label">Título</label>
              <Input
                id="wishlist-title-input"
                value={formState.title}
                onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Ex.: Mouse sem fios"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="wishlist-url-input" className="canhoes-field-label">URL</label>
              <Input
                id="wishlist-url-input"
                value={formState.url}
                onChange={(event) => setFormState((prev) => ({ ...prev, url: event.target.value }))}
                placeholder="URL opcional"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="wishlist-notes-input" className="canhoes-field-label">Notas</label>
            <Textarea
              id="wishlist-notes-input"
              value={formState.notes}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notas opcionais"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CanhoesFileTrigger
              accept="image/png,image/jpeg"
              fileName={formState.selectedFile?.name}
              onChange={(file) => setFormState((prev) => ({ ...prev, selectedFile: file }))}
              placeholder="Adicionar imagem (opcional)"
            />

            <Button disabled={!canSubmit || isSaving} onClick={() => void handleCreate()} aria-label="Adicionar item">
              {isSaving ? "A guardar..." : "Adicionar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {errorMessage ? (
        <ErrorAlert
          title="Erro ao carregar wishlist"
          description={errorMessage}
          actionLabel="Tentar novamente"
          onAction={() => void (eventId ? queryClient.invalidateQueries({ queryKey: ["wishlistItems", eventId] }) : Promise.resolve())}
        />
      ) : null}

      {isInitialLoading ? <WishlistLoadingState /> : null}

      {wishlistContent}
    </div>
  );
}

function WishlistMemberPanel({
  deletingItemId,
  items,
  member,
  onDelete,
  userId,
}: Readonly<{
  deletingItemId: string | null;
  items: EventWishlistItemDto[];
  member: PublicUserDto;
  onDelete: (wishlistItemId: string) => Promise<void>;
  userId: string | null;
}>) {
  const isCurrentUser = member.id === userId;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <span className="truncate">{member.displayName || member.email || member.id}</span>
          {isCurrentUser ? <Badge variant="outline">tu</Badge> : null}
          {member.isAdmin && !isCurrentUser ? <Badge variant="outline">admin</Badge> : null}
          <span className="body-small ml-auto text-[var(--color-text-muted)]">{formatCount(items.length, "item", "itens")}</span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {items.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-muted)] py-4">Sem itens nesta wishlist.</p>
        ) : (
          <VirtualizedList
            items={items}
            getKey={(wishlistItem) => wishlistItem.id}
            estimateSize={() => 108}
            className="max-h-[50svh]"
            renderItem={(wishlistItem) => (
              <div className="canhoes-list-item flex gap-3 p-2.5">
                <CanhoesMediaThumb alt={wishlistItem.title} src={wishlistItem.imageUrl} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{wishlistItem.title}</p>
                  {wishlistItem.notes ? (
                    <p className="line-clamp-2 text-xs text-[var(--color-text-muted)]">{wishlistItem.notes}</p>
                  ) : null}
                  {wishlistItem.url ? (
                    <a href={wishlistItem.url} target="_blank" rel="noreferrer" className="canhoes-link mt-1.5 inline-flex items-center gap-1 text-xs">
                      <LinkIcon className="h-3.5 w-3.5" />
                      Abrir link
                    </a>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {new Date(wishlistItem.updatedAtUtc).toLocaleDateString()}
                  </p>

                  {isCurrentUser ? (
                    <ConfirmDeleteAction
                      onConfirm={() => void onDelete(wishlistItem.id)}
                      title="Remover da Wishlist?"
                      description="Vais remover este item da tua wishlist. Esta ação não pode ser desfeita."
                      trigger={
                        <button
                          type="button"
                          disabled={deletingItemId === wishlistItem.id}
                          className="canhoes-tap rounded-full border border-transparent p-2 text-[var(--color-text-muted)] hover:border-[var(--color-danger)]/30 hover:text-[var(--color-danger)] disabled:opacity-50"
                          aria-label="Apagar item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      }
                    />
                  ) : null}
                </div>
              </div>
            )}
          />
        )}
      </CardContent>
    </Card>
  );
}
