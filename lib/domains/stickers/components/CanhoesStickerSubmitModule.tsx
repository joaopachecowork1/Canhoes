"use client";

import { useState } from "react";

import type { EventActiveContextDto, AwardCategoryDto, NomineeDto } from "@/lib/api/types";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { FormSheet } from "@/lib/domains/event/components/FormSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import messages from "@/messages/pt.json";

import { useStickerData, useStickerSubmission } from "../hooks/useStickers";
import { StickerFeedList } from "./StickerFeedList";
import { StickerSubmitForm } from "./StickerSubmitForm";

const copy = messages.stickers.CanhoesStickerSubmitModule;

function StickerSubmitLoadingState() {
  return (
    <div className="space-y-4">
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-4 w-full rounded" />
        </div>
      </div>
      <Card>
        <CardHeader className="space-y-1">
          <Skeleton className="h-4 w-32 rounded" />
          <Skeleton className="h-5 w-48 rounded" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-10 rounded-[var(--radius-md-token)]" />
            <Skeleton className="h-10 rounded-[var(--radius-md-token)]" />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <Skeleton className="h-20 rounded-[var(--radius-md-token)]" />
            <Skeleton className="aspect-square rounded-[var(--radius-md-token)]" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-64 rounded" />
            <Skeleton className="h-10 w-40 rounded-full" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-[var(--radius-lg-token)] border border-[var(--color-veil)]/12 bg-[var(--color-panel)]/90 p-3"
          >
            <Skeleton className="aspect-square w-full rounded-[var(--radius-md-token)]" />
            <Skeleton className="h-4 w-4/5 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StickerGallery({ isReady, stickers }: Readonly<{ isReady: boolean; stickers: NomineeDto[] }>) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="heading-3 text-[var(--color-text-primary)]">{copy.galleryTitle}</h2>
        </div>
        <Badge variant="secondary">{stickers.length}</Badge>
      </div>

      {isReady ? (
        <div className="pt-4">
          <StickerFeedList stickers={stickers} />
        </div>
      ) : null}
    </section>
  );
}

/** Página dos stickers: enviar a imagem de um sticker para uma categoria e ver os aprovados. */
export function CanhoesStickerSubmitModule({
  initialContext,
  initialStickerCategories,
  initialApprovedNominees,
}: {
  initialContext?: EventActiveContextDto | null;
  initialStickerCategories?: AwardCategoryDto[];
  initialApprovedNominees?: NomineeDto[];
}) {
  const { overview, event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const phaseType = overview?.activePhase?.type;
  const isProposalPhase = phaseType === "PROPOSALS";
  const stickers = useStickerData(eventId, {
    initialCategories: initialStickerCategories,
    initialNominees: initialApprovedNominees,
  });
  const submission = useStickerSubmission({ eventId, isProposalPhase, onSubmitted: stickers.refresh });

  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader module="stickers" title={copy.title} description={copy.description} />

      {isProposalPhase ? (
        <FormSheet isOpen={isFormOpen} onOpenChange={setIsFormOpen} title={copy.formTitle} triggerLabel={copy.openForm}>
          <StickerSubmitForm
            categories={stickers.stickerCategories}
            onSubmit={() => void submission.handleSubmit().then((isSent) => setIsFormOpen(!isSent))}
            submission={submission}
          />
        </FormSheet>
      ) : (
        <Button type="button" className="w-full" disabled>
          {copy.closed}
        </Button>
      )}

      {stickers.errorMessage ? (
        <ErrorAlert
          title={copy.loadErrorTitle}
          description={stickers.errorMessage}
          actionLabel={messages.common.retry}
          onAction={() => void stickers.refresh()}
        />
      ) : null}

      {stickers.isLoading && stickers.isEmpty ? <StickerSubmitLoadingState /> : null}

      <StickerGallery stickers={stickers.stickersWithImage} isReady={!stickers.isLoading && !stickers.errorMessage} />
    </div>
  );
}
