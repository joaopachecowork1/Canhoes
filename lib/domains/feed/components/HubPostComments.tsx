"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Trash2, Reply, X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteAction } from "@/components/ui/confirm-delete";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { Textarea } from "@/components/ui/textarea";
import { feedCopy } from "@/lib/canhoesCopy";
import { COMMENTS_QUERY_KEY } from "./hooks/useHubFeedComments";
import { feedRepo } from "@/lib/repositories/feedRepo";

import { formatDateTime, initials } from "./hubUtils";
import { buildCommentTree, flattenCommentTree } from "./hubPostCommentTree";

type HubPostCommentsProps = {
  postId: string;
  postAuthorName: string;
  eventId: string;
  commentCount: number;
  openComments: boolean;
  commentDraft: string;
  replyingToId: string | null;
  currentUserId?: string | null;
  currentUserName: string;
  currentUserImage?: string | null;
  onToggleComments: (postId: string) => void;
  onAddComment: (postId: string) => void;
  onDeleteComment: (postId: string, commentId: string) => void;
  onCommentDraftChange: (postId: string, text: string) => void;
  setReplyingTo: (postId: string, commentId: string | null) => void;
};

export function HubPostComments({
  postId,
  postAuthorName,
  eventId,
  commentCount,
  openComments,
  commentDraft,
  replyingToId,
  currentUserId,
  currentUserName,
  currentUserImage,
  onToggleComments,
  onAddComment,
  onDeleteComment,
  onCommentDraftChange,
  setReplyingTo,
}: Readonly<HubPostCommentsProps>) {

  const { data: fetchedComments } = useQuery({
    queryKey: [COMMENTS_QUERY_KEY, postId],
    queryFn: () => feedRepo.getComments(eventId, postId),
    enabled: openComments,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
  });

  const loadedComments = (fetchedComments ?? []).filter(Boolean);

  const sortedComments =
    loadedComments.length < 2
      ? loadedComments
      : [...loadedComments].sort((left, right) =>
          String(left.createdAtUtc).localeCompare(String(right.createdAtUtc))
        );

  const displayComments = flattenCommentTree(buildCommentTree(sortedComments));

  if (!openComments) return null;
  
  const replyingToComment = replyingToId
    ? loadedComments.find((comment) => comment.id === replyingToId)
    : null;

  return (
    <>
      <section className="bg-[var(--bg-paper)] rounded-[1.25rem] p-4 sm:p-5 border border-[var(--border-paper)] shadow-md">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
            <MessageSquare className="h-4 w-4 text-[var(--moss)]" />
            <span className="font-medium">
              {commentCount > 0
                ? `${commentCount} comentário${commentCount === 1 ? "" : "s"}`
                : "Sem comentários ainda"}
            </span>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-3 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06]"
            onClick={() => onToggleComments(postId)}
            aria-label="Fechar comentários"
          >
            Fechar
          </Button>
        </div>

        <div className="space-y-0 relative">
          {displayComments.length === 0 ? (
            <div className="rounded-xl px-4 py-6 text-center text-sm text-[var(--text-muted)] bg-[var(--bg-deep)] border border-white/[0.04]">
              {feedCopy.comments.empty}
            </div>
          ) : (
              <VirtualizedList
              items={displayComments}
              getKey={(comment) => comment.id}
              estimateSize={() => 120}
              className="max-h-[50svh]"
              renderItem={(comment) => {
                const isOwnComment = Boolean(currentUserId) && comment.userId === currentUserId;
                const marginLeft = comment.indentLevel * 32;

                return (
                  <article
                    style={{ paddingLeft: `${marginLeft + 12}px` }}
                    className="group relative flex gap-3 pr-3 py-3 transition-colors hover:bg-white/[0.02]"
                  >
                    {/* Vertical Thread Line */}
                    {comment.indentLevel > 0 && (
                      <div 
                        className="absolute top-0 bottom-0 w-px bg-[var(--border-subtle)]"
                        style={{ left: `${marginLeft + 12 - 16}px` }}
                      />
                    )}
                    {comment.indentLevel > 0 && (
                      <div 
                        className="absolute top-[28px] h-px bg-[var(--border-subtle)]"
                        style={{ left: `${marginLeft + 12 - 16}px`, width: '16px' }}
                      />
                    )}

                    <div className="relative flex flex-col items-center">
                      <Avatar className="h-8 w-8 shrink-0 border border-white/[0.08] bg-[var(--bg-deep)]">
                        {comment.userName === currentUserName && currentUserImage ? (
                          <AvatarImage src={currentUserImage} alt={comment.userName} />
                        ) : null}
                        <AvatarFallback className="bg-[var(--bg-deep)] text-[10px] font-semibold text-[var(--text-muted)]">
                          {initials(comment.userName)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Line connecting to children */}
                      {comment.hasChildren && (
                        <div className="absolute top-8 bottom-[-12px] w-px bg-[var(--border-subtle)]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-[var(--text-primary)]">
                          {comment.userName}
                        </span>
                        {comment.userName === postAuthorName && (
                          <Badge
                            variant="outline"
                            className="h-4 min-w-4 border-[var(--moss)]/30 bg-[var(--moss)]/10 px-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--moss)]"
                          >
                            OP
                          </Badge>
                        )}
                        <span className="text-xs text-[var(--text-muted)]">
                          · {formatDateTime(comment.createdAtUtc)}
                        </span>
                      </div>

                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--text-primary)]">
                        {comment.text}
                      </p>


                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          className="canhoes-tap flex items-center gap-1.5 rounded px-2 py-1 -ml-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--moss)] hover:bg-[var(--moss)]/10"
                          aria-label="Responder"
                          onClick={() => {
                            setReplyingTo(postId, comment.id);
                            setTimeout(() => {
                              const el = document.getElementById(`comment-input-${postId}`);
                              if (el) {
                                el.focus({ preventScroll: false });
                              }
                            }, 50);
                          }}
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Responder
                        </button>
                      
                        {isOwnComment && (
                          <ConfirmDeleteAction
                            onConfirm={() => onDeleteComment(postId, comment.id)}
                            title="Apagar comentário?"
                            description="Este comentário vai desaparecer do feed para todos os membros."
                            trigger={
                              <button
                                type="button"
                                className="canhoes-tap flex items-center gap-1.5 rounded px-2 py-1 -mr-2 text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                                aria-label="Apagar comentário"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Apagar
                              </button>
                            }
                          />
                        )}
                      </div>
                    </div>
                  </article>
                );
              }}
            />
          )}
        </div>

        {/* Comment form */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-deep)]/50 rounded-b-[1.25rem] flex gap-3 p-4 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-2">
          <Avatar className="mt-1 h-8 w-8 shrink-0 border border-white/[0.08] bg-[var(--bg-surface)]">
            {currentUserImage ? (
              <AvatarImage src={currentUserImage} alt={currentUserName} />
            ) : null}
            <AvatarFallback className="bg-[var(--bg-surface)] text-[10px] font-semibold text-[var(--text-muted)]">
              {initials(currentUserName)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            {replyingToComment && (
              <div className="flex items-center justify-between bg-[var(--moss)]/10 border border-[var(--moss)]/20 text-[var(--moss)] text-xs px-3 py-2 rounded-lg mb-2">
                <span className="truncate">
                  A responder a <span className="font-semibold">{replyingToComment.userName}</span>
                </span>
                <button 
                  type="button" 
                  onClick={() => setReplyingTo(postId, null)}
                  className="text-[var(--moss)] hover:text-white p-1 rounded-full hover:bg-[var(--moss)]/20 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          
            <Textarea
              id={`comment-input-${postId}`}
              value={commentDraft}
              onChange={(event) => onCommentDraftChange(postId, event.target.value)}
              placeholder={replyingToId ? "Escreve a tua resposta..." : feedCopy.comments.placeholder}
              className="min-h-[72px] resize-none text-sm border-white/[0.08] bg-[var(--bg-surface)] placeholder:text-[var(--text-muted)] rounded-xl"
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
               
                onClick={() => onCommentDraftChange(postId, "")}
                disabled={!commentDraft}
              >
                Limpar
              </Button>
              <Button
                type="button"
                size="sm"
               
                onClick={() => onAddComment(postId)}
                disabled={!commentDraft.trim()}
              >
                {feedCopy.comments.submit}
              </Button>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
