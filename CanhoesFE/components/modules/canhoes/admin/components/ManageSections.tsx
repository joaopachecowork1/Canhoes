/**
 * ManageSections — Grid 2x2 de secções de gestão Admin
 * 
 * Cada card representa uma secção gerível (Utilizadores, Votos, Posts, Stickers)
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme/tokens';
import { NumberBadge } from '@/components/ui/NumberBadge';

interface ManageSectionCardProps {
  icon: React.ReactNode;
  title: string;
  count: number;
  onClick?: () => void;
  className?: string;
}

function ManageSectionCard({
  icon,
  title,
  count,
  onClick,
  className,
}: ManageSectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border p-6',
        'bg-[var(--color-bg-card)] border-[var(--color-border-subtle)]',
        'transition-all duration-200 hover:scale-105 hover:border-[var(--color-moss)]/40',
        'active:scale-95',
        className
      )}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{
          backgroundColor: `${colors.moss}20`,
          color: colors.mossLight,
        }}
      >
        {icon}
      </div>
      
      <div className="text-center">
        <div
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: colors.textSecondary }}
        >
          {title}
        </div>
        <div className="mt-2 flex justify-center">
          <NumberBadge value={count} color={colors.psycho} size="lg" animated />
        </div>
      </div>
    </button>
  );
}

interface ManageSectionsProps {
  usersCount?: number;
  votesCount?: number;
  postsCount?: number;
  stickersCount?: number;
  onNavigate?: (section: string) => void;
}

export function ManageSections({
  usersCount = 0,
  votesCount = 0,
  postsCount = 0,
  stickersCount = 0,
  onNavigate,
}: ManageSectionsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ManageSectionCard
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
        title="Utilizadores"
        count={usersCount}
        onClick={() => onNavigate?.('users')}
      />
      
      <ManageSectionCard
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="Votos"
        count={votesCount}
        onClick={() => onNavigate?.('votes')}
      />
      
      <ManageSectionCard
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
        title="Posts"
        count={postsCount}
        onClick={() => onNavigate?.('posts')}
      />
      
      <ManageSectionCard
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        title="Stickers"
        count={stickersCount}
        onClick={() => onNavigate?.('stickers')}
      />
    </div>
  );
}
