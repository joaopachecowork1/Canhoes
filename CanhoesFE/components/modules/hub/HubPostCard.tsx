"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { HubCommentDto, HubPostDto } from "@/lib/api/types";

// Componentes do Hub
import { PostHeader } from "./components/PostHeader";
import { MediaCarousel } from "./components/MediaCarousel";
import { PollBox } from "./components/PollBox";
import { CommentsSection } from "./components/CommentsSection";
import { HUB_EMOJIS } from "./components/ReactionRail";

// Animações
import { BlurFade } from "@/components/animations/BlurFade";
import { NumberTicker } from "@/components/animations/NumberTicker";

interface HubPostCardProps {
    post: HubPostDto;
    index: number;
    isAdmin: boolean;
    openComments: boolean;
    commentDraft: string;
    comments?: HubCommentDto[];
    onToggleReaction: (postId: string, emoji: string) => void;
    onToggleComments: (postId: string) => void;
    onVotePoll: (postId: string, optionId: string) => void;
    onAddComment: (postId: string) => void;
    onCommentDraftChange: (postId: string, text: string) => void;
    onToggleCommentReaction: (postId: string, commentId: string, emoji: string) => void;
    onAdminPin: (postId: string) => void;
    onAdminDelete: (postId: string) => void;
}

/**
 * Card de Post do Feed (Estilo Instagram)
 *
 * Visual "canhao-card" do mockup:
 * - Dark glass com neon border verde
 * - BlurFade ao entrar no viewport
 * - NumberTicker nos badges numéricos
 * - Botões de reação com gradiente psycho
 */
export function HubPostCard({
    post,
    index,
    isAdmin,
    openComments,
    commentDraft,
    comments = [],
    onToggleReaction,
    onToggleComments,
    onVotePoll,
    onAddComment,
    onCommentDraftChange,
    onToggleCommentReaction,
    onAdminPin,
    onAdminDelete,
}: HubPostCardProps) {
    const media = (post.mediaUrls ?? []).filter(Boolean);
    const counts = post.reactionCounts || {};

    return (
        <BlurFade delay={index * 50}>
            {/* Canhao Card - Dark glass com neon border */}
            <div
                className="overflow-hidden rounded-none sm:rounded-2xl"
                style={{
                    background: "linear-gradient(145deg, #0f2018, #0a1510)",
                    border: "0px solid transparent",
                    borderTop: "1px solid rgba(0,255,68,0.12)",
                    borderBottom: "1px solid rgba(0,255,68,0.08)",
                    boxShadow: "0 0 0 1px rgba(0,255,68,0.10), 0 0 20px rgba(0,170,51,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
            >
                {/* Header + Texto */}
                <div className="px-3 pt-3 pb-2.5 sm:p-4">
                    <PostHeader
                        authorName={post.authorName}
                        createdAtUtc={post.createdAtUtc}
                        isAdmin={isAdmin}
                        onAdminPin={() => onAdminPin(post.id)}
                        onAdminDelete={() => onAdminDelete(post.id)}
                    />
                    {!!post.text && (
                        <div
                            className="mt-2.5 whitespace-pre-wrap break-words text-[13px] sm:text-sm leading-relaxed"
                            style={{ color: "#d0f0d0", fontFamily: "'Nunito', sans-serif", fontWeight: 600 }}
                        >
                            {post.text}
                        </div>
                    )}
                </div>

                {/* Media Carousel */}
                {media.length > 0 && (
                    <div className="px-0 sm:px-4 pb-2.5 sm:pb-3">
                        <MediaCarousel urls={media} />
                    </div>
                )}

                {/* Poll */}
                {post.poll && (
                    <div className={cn("px-3 sm:px-4 pb-2.5 sm:pb-3", media.length > 0 ? "pt-0" : "")}>
                        <PollBox poll={post.poll} onVote={(optionId) => onVotePoll(post.id, optionId)} />
                    </div>
                )}

                {/* Reações + Comentários */}
                <div className="px-3 pb-3 sm:px-4 sm:pb-4">
                    <div className="flex items-center justify-between">
                        {/* Reações */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pr-1">
                            {HUB_EMOJIS.map((emoji) => {
                                const active = (post.myReactions ?? []).includes(emoji);
                                const count = counts[emoji] ?? (emoji === "❤️" ? post.likeCount ?? 0 : 0);
                                return (
                                    <Button
                                        key={emoji}
                                        variant={active ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => onToggleReaction(post.id, emoji)}
                                        className="canhoes-tap h-8 gap-1.5 rounded-full px-2.5 shrink-0"
                                        style={
                                            active
                                                ? {
                                                    background: "linear-gradient(90deg, #00cc44, #008833)",
                                                    border: "1.5px solid rgba(0,255,68,0.40)",
                                                    color: "white",
                                                }
                                                : {
                                                    background: "rgba(0,20,10,0.6)",
                                                    border: "1px solid rgba(0,255,68,0.18)",
                                                    color: "rgba(0,255,68,0.80)",
                                                }
                                        }
                                    >
                                        <span className="text-sm leading-none">{emoji}</span>
                                        <NumberTicker value={count} className="tabular-nums text-xs" />
                                    </Button>
                                );
                            })}

                            {/* Botão Comentários */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onToggleComments(post.id)}
                                className="canhoes-tap h-8 gap-1.5 rounded-full px-2.5 shrink-0"
                                style={{
                                    background: "rgba(0,20,10,0.6)",
                                    border: "1px solid rgba(0,255,68,0.18)",
                                    color: "rgba(0,255,68,0.80)",
                                }}
                            >
                                <span className="text-sm leading-none">💬</span>
                                <NumberTicker value={post.commentCount ?? 0} className="tabular-nums text-xs" />
                            </Button>
                        </div>

                        {/* Badge Fixado */}
                        {post.isPinned && (
                            <Badge
                                variant="secondary"
                                style={{
                                    background: "rgba(255,225,53,0.10)",
                                    border: "1px solid rgba(255,225,53,0.35)",
                                    color: "#ffe135",
                                    fontFamily: "'Nunito', sans-serif",
                                    fontWeight: 700,
                                    fontSize: "11px",
                                }}
                            >
                                📌 Fixado
                            </Badge>
                        )}
                    </div>

                    {/* Secção de Comentários */}
                    {openComments && (
                        <div className="mt-4">
                            <CommentsSection
                                comments={comments}
                                draft={commentDraft}
                                onDraftChange={(text) => onCommentDraftChange(post.id, text)}
                                onSubmit={() => onAddComment(post.id)}
                                onToggleReaction={(commentId, emoji) => onToggleCommentReaction(post.id, commentId, emoji)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </BlurFade>
    );
}
