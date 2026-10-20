"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";

import { FeedSkeleton } from "@/components/ui/FeedSkeleton";
import { useHubFeed } from "@/lib/domains/feed/hooks/useHubFeed";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { useAuth, useIsAdmin } from "@/components/providers/AuthContext";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FeedComposeSlot } from "./FeedComposeSlot";
import { HubFeedList } from "./HubFeedList";
import { MemberCromoStrip } from "./MemberCromoStrip";
import { useFeedInfiniteScroll } from "../hooks/useFeedInfiniteScroll";
import type { FeedInfiniteData } from "../hooks/feedInfiniteData";
import messages from "@/messages/pt.json";
import type { EventActiveContextDto } from "@/lib/api/types";

const copy = messages.feed.HubFeedModule;

type SessionUser = { name?: string | null; email?: string | null; image?: string | null } | undefined;

/** O nome a mostrar do utilizador da sessão: nome, senão email, senão um texto por defeito. */
function getSessionUserName(user: SessionUser) {
  return user?.name?.trim() || user?.email?.trim() || copy.currentUserFallback;
}

/** O módulo do mural: mostra o esqueleto enquanto carrega e depois a lista de posts. */
export function HubFeedModule({
  initialData,
  initialContext,
}: Readonly<{
  initialData?: FeedInfiniteData;
  initialContext?: EventActiveContextDto | null;
}>) {
  const state = useHubFeedModuleState(initialData, initialContext);

  if (state.loading && !initialData) return <FeedSkeleton count={3} />;

  return <HubFeedModuleView state={state} />;
}

type HubFeedState = ReturnType<typeof useHubFeedModuleState>;

/** A lista de posts, ligada ao estado do mural. */
function HubFeedStateList({ state }: Readonly<{ state: HubFeedState }>) {
  const {
    posts,
    remainingPostsCount,
    hasMore,
    isFetchingNextPage,
    openComments,
    commentDrafts,
    replyingTo,
    toggleReaction,
    toggleDownvote,
    votePoll,
    toggleComments,
    addComment,
    deleteComment,
    setCommentDraft,
    setReplyingTo,
    adminPin,
    adminMovePinned,
    adminDelete,
    currentUserId,
    currentUserImage,
    currentUserName,
    isAdmin,
    sentinelRef,
  } = state;

  return (
    <HubFeedList
      posts={posts}
      remainingPostsCount={remainingPostsCount}
      eventId={state.eventId ?? ""}
      isAdmin={isAdmin}
      hasMore={hasMore}
      isFetchingNextPage={isFetchingNextPage}
      currentUserId={currentUserId}
      currentUserImage={currentUserImage}
      currentUserName={currentUserName}
      openComments={openComments}
      commentDrafts={commentDrafts}
      replyingTo={replyingTo}
      onLoadMore={state.loadMore}
      onToggleReaction={toggleReaction}
      onToggleDownvote={toggleDownvote}
      onToggleComments={toggleComments}
      onVotePoll={votePoll}
      onAddComment={addComment}
      onDeleteComment={deleteComment}
      onCommentDraftChange={setCommentDraft}
      onAdminPin={adminPin}
      onAdminMovePinned={adminMovePinned}
      onAdminDelete={adminDelete}
      setReplyingTo={setReplyingTo}
      sentinelRef={sentinelRef}
    />
  );
}

/** A estrutura visual do mural: cromos dos membros, espaço para publicar, erro e lista. */
function HubFeedModuleView({ state }: Readonly<{ state: HubFeedState }>) {
  const { errorMessage, refresh } = state;
  const handleRetry = useCallback(() => void refresh(), [refresh]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-1 sm:px-0">
      <h1 className="sr-only">{copy.title}</h1>
      <MemberCromoStrip eventId={state.eventId} />
      <FeedComposeSlot />
      {errorMessage ? (
        <ErrorAlert
          title={copy.loadError}
          description={errorMessage}
          actionLabel={messages.common.retry}
          tone="social"
          onAction={handleRetry}
        />
      ) : null}
      <HubFeedStateList state={state} />
    </div>
  );
}

/** Junta o feed, a sessão e o evento ativo no estado de que o mural precisa. */
function useHubFeedModuleState(initialData?: FeedInfiniteData, initialContext?: EventActiveContextDto | null) {
  const { data: session } = useSession();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const isAdmin = useIsAdmin();
  const { event: activeEvent } = useEventOverview(initialContext);
  const eventId = activeEvent?.id ?? null;
  const feed = useHubFeed(eventId, initialData);
  const sentinelRef = useFeedInfiniteScroll({
    enabled: feed.hasMore,
    isFetchingNextPage: feed.isFetchingNextPage,
    onLoadMore: feed.loadMore,
  });
  const currentUserName = getSessionUserName(session?.user);
  const currentUserImage = session?.user?.image ?? null;

  return {
    ...feed,
    eventId,
    currentUserId,
    currentUserImage,
    currentUserName,
    isAdmin,
    loadMore: feed.loadMore,
    sentinelRef,
  };
}
