"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import { ScrollText } from "lucide-react";

import { FeedSkeleton } from "@/components/ui/FeedSkeleton";
import { useHubFeed } from "@/lib/domains/feed/components/hooks/useHubFeed";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useAuth, useIsAdmin } from "@/contexts/AuthContext";
import { feedCopy } from "@/lib/canhoesCopy";
import { CanhoesModuleHeader } from "@/components/modules/canhoes/CanhoesModuleParts";
import { ErrorAlert } from "@/components/ui/error-alert";
import { HubFeedList } from "./HubFeedList";
import { useFeedInfiniteScroll } from "./useFeedInfiniteScroll";
import type { FeedInfiniteData } from "./hooks/feedInfiniteData";

export function HubFeedModule({
  initialData,
  initialContext,
}: Readonly<{
  initialData?: FeedInfiniteData;
  initialContext?: import("@/lib/api/types").EventActiveContextDto | null;
}>) {
  const state = useHubFeedModuleState(initialData, initialContext);

  if (state.loading && !initialData) return <FeedSkeleton count={3} />;

  return <HubFeedModuleView state={state} />;
}

function HubFeedModuleView({
  state,
}: Readonly<{
  state: ReturnType<typeof useHubFeedModuleState>;
}>) {
  const {
    posts,
    remainingPostsCount,
    errorMessage,
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
    refresh,
    currentUserId,
    currentUserImage,
    currentUserName,
    isAdmin,
    sentinelRef,
  } = state;

  const handleRetry = useCallback(() => void refresh(), [refresh]);
  const handleLoadMore = state.loadMore;

  const feedList = (
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
      onLoadMore={handleLoadMore}
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

  return (
    <div className="zone-feed mx-auto w-full max-w-3xl space-y-3 px-3 sm:px-0">
      <CanhoesModuleHeader icon={ScrollText} title={feedCopy.hero.title} description={feedCopy.hero.description} />
      {errorMessage ? <ErrorAlert title="Erro ao carregar o mural" description={errorMessage} actionLabel="Tentar novamente" tone="social" onAction={handleRetry} /> : null}
      {feedList}
    </div>
  );
}

function useHubFeedModuleState(initialData?: FeedInfiniteData, initialContext?: import("@/lib/api/types").EventActiveContextDto | null) {
  const { data: session } = useSession();
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const isAdmin = useIsAdmin();
  const { event: activeEvent } = useEventOverview(initialContext);
  const eventId = activeEvent?.id ?? null;
  const feed = useHubFeed(eventId, currentUserId, initialData);
  const sentinelRef = useFeedInfiniteScroll({ enabled: feed.hasMore, isFetchingNextPage: feed.isFetchingNextPage, onLoadMore: feed.loadMore });
  const currentUserName = session?.user?.name?.trim() || session?.user?.email?.trim() || "Tu";
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
