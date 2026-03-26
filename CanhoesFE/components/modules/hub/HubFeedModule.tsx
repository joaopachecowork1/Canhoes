"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/lib/auth/useIsAdmin";
import { useHubFeed } from "@/hooks/useHubFeed";

import { PostComposer, type PostComposerSubmitData } from "./components/PostComposer";
import { HubPostCard } from "./HubPostCard";
import { Particles } from "@/components/animations/Particles";
import { FeedSkeleton } from "@/components/ui/FeedSkeleton";

/**
 * Hub Feed Module - Instagram Style
 * 
 * Componente principal do feed, agora simplificado com:
 * - useHubFeed hook para toda a lógica
 * - HubPostCard para renderização de cada post
 * - Particles effect ao votar
 * - FeedSkeleton para loading
 */
export function HubFeedModule({
  showComposer = true,
}: Readonly<{
  showComposer?: boolean;
}>) {
  const { data: session, status } = useSession();
  const isAdmin = useIsAdmin();

  // Hook com toda a lógica do feed
  const {
    posts,
    loading,
    comments,
    openComments,
    commentDrafts,
    showParticles,
    setShowParticles,
    refresh,
    toggleReaction,
    votePoll,
    toggleComments,
    addComment,
    setCommentDraft,
    toggleCommentReaction,
    adminPin,
    adminDelete,
  } = useHubFeed();

  // Auto-heal sessions sem idToken
  if (status === "authenticated" && !session?.idToken) {
    signOut({ redirect: false }).then(() => signIn("google"));
  }

  // Handler para criar post
  const handleCreatePost = async (data: PostComposerSubmitData) => {
    const trimmed = data.text.trim();
    if (!trimmed) return;

    try {
      let mediaUrls: string[] = [];
      if (data.files.length > 0) {
        const { hubRepo } = await import("@/lib/repositories/hubRepo");
        mediaUrls = await hubRepo.uploadImages(data.files);
      }

      const { hubRepo } = await import("@/lib/repositories/hubRepo");
      const pollQuestion = data.pollOn ? data.pollQuestion.trim() : "";
      const pollOptions = data.pollOn ? data.pollOptions.map((o) => o.trim()).filter(Boolean) : [];

      const created = await hubRepo.createPost({
        text: trimmed,
        mediaUrls,
        pollQuestion: data.pollOn && pollQuestion ? pollQuestion : null,
        pollOptions: data.pollOn ? pollOptions : null,
      });

      if (created?.id) {
        // Dispatch event para o feed atualizar
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("hub:postCreated", { detail: created }));
        }
      }
      toast.success("Post publicado");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível publicar");
      throw e;
    }
  };

  return (
    <div className="space-y-0 sm:space-y-3">
      {/* Header do Feed */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-0 sm:py-0 sm:mb-2">
        <div className="canhoes-title text-base" style={{ fontSize: "16px" }}>
          🌿 Feed
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="canhoes-tap h-8 w-8 p-0 rounded-xl"
          onClick={() => void refresh()}
          disabled={loading}
          style={{ color: "rgba(0,255,68,0.60)", background: "rgba(0,255,68,0.06)", border: "1px solid rgba(0,255,68,0.12)" }}
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>
      </div>

      {/* Composer (inline ou via bottom sheet) */}
      {showComposer && <PostComposer onSubmit={handleCreatePost} />}

      {/* Loading Skeletons */}
      {loading && <FeedSkeleton count={3} />}

      {/* Lista de Posts */}
      {!loading && (
        <div className="space-y-3">
          {posts.map((post, index) => (
            <HubPostCard
              key={post.id}
              post={post}
              index={index}
              isAdmin={isAdmin}
              openComments={openComments[post.id] ?? false}
              commentDraft={commentDrafts[post.id] ?? ""}
              comments={comments[post.id] ?? []}
              onToggleReaction={toggleReaction}
              onToggleComments={toggleComments}
              onVotePoll={votePoll}
              onAddComment={addComment}
              onCommentDraftChange={setCommentDraft}
              onToggleCommentReaction={toggleCommentReaction}
              onAdminPin={adminPin}
              onAdminDelete={adminDelete}
            />
          ))}

          {!loading && posts.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">Sem posts ainda.</div>
          )}
        </div>
      )}

      {/* Particles effect ao votar */}
      {showParticles && (
        <Particles
          count={24}
          onComplete={() => setShowParticles(null)}
          className="pointer-events-none fixed inset-0 z-50"
        />
      )}
    </div>
  );
}
