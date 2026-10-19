"use client";

import Image from "next/image";
import { Inbox } from "lucide-react";
import { absMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import type { NomineeDto } from "@/lib/api/types";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.stickers.StickerFeedList;

const ITEM_CLASS =
  "group relative overflow-hidden rounded-[var(--radius-lg-token)] border border-[var(--border-paper)] bg-[var(--bg-paper)] shadow-[var(--shadow-paper)] transition duration-200 ease-out hover:shadow-[var(--shadow-paper-soft)] mb-6";

/** "Agora mesmo", "5h", or the day and month for older stickers. */
function relativeTimeLabel(dateString: string) {
  const date = new Date(dateString);
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
  if (hours < 1) return copy.justNow;
  if (hours < 24) return formatMessage(copy.hoursAgo, { hours });
  return date.toLocaleDateString("pt-PT", { day: "numeric", month: "short" });
}

function RelativeTime({ dateString }: { dateString: string }) {
  return <time dateTime={dateString} className="shrink-0 text-xs text-[var(--ink-muted)]">{relativeTimeLabel(dateString)}</time>;
}

function StickerFeedCard({ sticker }: { sticker: NomineeDto }) {
  return (
    <article className={cn(ITEM_CLASS, "flex flex-col")}>
      {sticker.imageUrl ? (
        <div className="relative w-full bg-[var(--bg-paper-soft)] border-b border-[var(--border-paper-soft)]">
          <div className="absolute inset-0 animate-pulse bg-[var(--bg-paper)]" />
          <Image
            src={absMediaUrl(sticker.imageUrl)}
            alt={sticker.title}
            sizes="(max-width: 768px) 100vw, 600px"
            className="relative z-10 w-full object-cover max-h-[28rem] sm:max-h-[32rem]"
            width={600}
            height={450}
            unoptimized
            onLoad={(e) => {
              const placeholder = e.currentTarget.previousElementSibling;
              if (placeholder instanceof HTMLElement) placeholder.style.display = "none";
            }}
          />
        </div>
      ) : null}

      <div className="flex items-baseline justify-between gap-3 px-4 py-3">
        <p className="text-base font-medium text-[var(--ink-primary)]">{sticker.title}</p>
        <RelativeTime dateString={sticker.createdAtUtc} />
      </div>
    </article>
  );
}

/** Approved stickers, one card each. */
export function StickerFeedList({ stickers }: { stickers: NomineeDto[] }) {
  if (stickers.length === 0) {
    return <EmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyDescription} />;
  }

  return (
    <div className="max-w-xl mx-auto w-full">
      {stickers.map(sticker => (
        <StickerFeedCard key={sticker.id} sticker={sticker} />
      ))}
    </div>
  );
}
