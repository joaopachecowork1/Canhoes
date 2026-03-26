"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface FeedSkeletonProps {
  count?: number;
}

/**
 * Loading Skeleton para o Feed
 *
 * Mockup reference:
 * - Cards com shimmer animation
 * - Header, avatar, texto, e botões skeleton
 * - BlurFade entrance
 */
export function FeedSkeleton({ count = 3 }: FeedSkeletonProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <FeedPostSkeleton key={i} index={i} />
      ))}
    </div>
  );
}

interface FeedPostSkeletonProps {
  index: number;
}

function FeedPostSkeleton({ index }: FeedPostSkeletonProps) {
  return (
    <div
      className="overflow-hidden rounded-none sm:rounded-2xl blurfade-in"
      style={{
        animationDelay: `${index * 50}ms`,
        background: "linear-gradient(145deg, #0f2018, #0a1510)",
        borderTop: "1px solid rgba(0,255,68,0.12)",
        borderBottom: "1px solid rgba(0,255,68,0.08)",
        boxShadow: "0 0 0 1px rgba(0,255,68,0.10), 0 0 20px rgba(0,170,51,0.12), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Header do Post */}
      <div className="px-3 pt-3 pb-2.5 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Avatar skeleton */}
          <div className="h-10 w-10 rounded-full bg-[var(--color-moss)]/20 animate-pulse" />
          
          {/* Nome + timestamp skeleton */}
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[var(--color-moss)]/20 animate-pulse" />
            <div className="h-2 w-20 rounded bg-[var(--color-moss)]/10 animate-pulse" />
          </div>
        </div>

        {/* Texto skeleton */}
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-[var(--color-moss)]/15 animate-pulse" />
          <div className="h-3 w-5/6 rounded bg-[var(--color-moss)]/15 animate-pulse" />
          <div className="h-3 w-4/6 rounded bg-[var(--color-moss)]/10 animate-pulse" />
        </div>
      </div>

      {/* Media placeholder */}
      <div className="px-0 sm:px-4 pb-2.5 sm:pb-3">
        <div className="aspect-[4/3] w-full rounded-lg bg-[var(--color-moss)]/10 animate-pulse" />
      </div>

      {/* Reações skeleton */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-8 w-16 rounded-full bg-[var(--color-moss)]/20 animate-pulse"
            />
          ))}
          <div className="h-8 w-20 rounded-full bg-[var(--color-moss)]/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton inline para conteúdo pequeno
 */
export function InlineSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "h-4 rounded bg-[var(--color-moss)]/20 animate-pulse",
        className
      )}
    />
  );
}

/**
 * Skeleton de card genérico
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg-token)] border border-[var(--color-moss)]/20 bg-[var(--color-bg-card)] p-4",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-[var(--color-moss)]/20 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-[var(--color-moss)]/20 animate-pulse" />
          <div className="h-2 w-20 rounded bg-[var(--color-moss)]/10 animate-pulse" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full rounded bg-[var(--color-moss)]/15 animate-pulse" />
        <div className="h-3 w-5/6 rounded bg-[var(--color-moss)]/15 animate-pulse" />
      </div>
    </div>
  );
}
