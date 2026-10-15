"use client";

import Image from "next/image";
import { Heart, Inbox, MoreHorizontal } from "lucide-react";
import { absMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { NomineeDto } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/empty-state";

const ITEM_CLASS =
  "group relative overflow-hidden rounded-[var(--radius-lg-token)] border border-[var(--border-paper)] bg-[var(--bg-paper)] shadow-[var(--shadow-paper)] transition-all duration-300 ease-out hover:shadow-[var(--shadow-paper-soft)] mb-6";

function RelativeTime({ dateString }: { dateString: string }) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  
  if (diffInHours < 1) return <span className="text-[10px] text-[var(--ink-muted)]">Agora mesmo</span>;
  if (diffInHours < 24) return <span className="text-[10px] text-[var(--ink-muted)]">{diffInHours}h</span>;
  return <span className="text-[10px] text-[var(--ink-muted)]">{date.toLocaleDateString("pt-PT", { day: 'numeric', month: 'short' })}</span>;
}

function StickerFeedCard({ sticker }: { sticker: NomineeDto }) {
  return (
    <div className={cn(ITEM_CLASS, "flex flex-col")}>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-paper-soft)] border border-[var(--border-paper-soft)] text-xs font-bold text-[var(--ink-primary)]">
            CA
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-semibold text-[var(--ink-primary)] leading-none">
              Comunidade
            </p>
            <RelativeTime dateString={sticker.createdAtUtc} />
          </div>
        </div>
        <button type="button" className="text-[var(--ink-muted)] hover:text-[var(--ink-primary)] p-1 rounded-full hover:bg-[var(--bg-paper-soft)] transition-colors" aria-label="Mais opções">
            <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      {sticker.imageUrl ? (
        <div className="relative w-full bg-[var(--bg-paper-soft)] border-y border-[var(--border-paper-soft)]">
          <div className="absolute inset-0 animate-pulse bg-[rgba(255,255,255,0.08)]" />
          <Image
            src={absMediaUrl(sticker.imageUrl)}
            alt={sticker.title}
            sizes="(max-width: 768px) 100vw, 600px"
            className="relative z-10 w-full object-cover max-h-[28rem] sm:max-h-[32rem]"
            width={600}
            height={450}
            unoptimized
            onLoad={(e) => {
              const placeholder = e.currentTarget.previousElementSibling as HTMLElement | null;
              if (placeholder) placeholder.style.display = 'none';
            }}
          />
        </div>
      ) : null}

      <div className="px-4 py-3">
        <p className="body-small font-medium text-[var(--ink-primary)]">
          {sticker.title}
        </p>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-paper-soft)]">
        <div className="flex items-center gap-4">
            <button type="button" className="canhoes-tap flex items-center gap-1.5 text-[var(--ink-secondary)] hover:text-[var(--color-danger)] transition-colors group">
                <Heart className="h-5 w-5 group-active:scale-90 transition-transform" />
                <span className="text-xs font-medium">Lindo</span>
            </button>
        </div>
      </div>
    </div>
  );
}

/** Approved stickers, one card each. */
export function StickerFeedList({ stickers }: { stickers: NomineeDto[] }) {
  if (stickers.length === 0) {
    return <EmptyState icon={Inbox} title="Sem stickers" description="Ainda não há stickers com imagem para mostrar." />;
  }

  return (
    <div className="max-w-xl mx-auto w-full">
      {stickers.map(sticker => (
        <StickerFeedCard key={sticker.id} sticker={sticker} />
      ))}
    </div>
  );
}
