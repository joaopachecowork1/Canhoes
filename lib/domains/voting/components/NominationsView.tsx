"use client";

import { CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { useMutation, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { AwardCategoryDto, MyNominationStatusDto, NomineeDto } from "@/lib/api/types";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { CanhoesFeatureCard, CanhoesFileTrigger } from "@/components/modules/canhoes/CanhoesModuleParts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { formatCount } from "@/lib/utils";

export function NominationsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Skeleton className="h-10 w-full rounded-[var(--radius-md-token)]" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <div className="space-y-2 rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(22,28,15,0.72)] p-4">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-[var(--radius-md-token)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

type CategoryNominationCardProps = Readonly<{
  category: AwardCategoryDto;
  eventId: string;
  myStatus: MyNominationStatusDto | undefined;
  approvedNominees: NomineeDto[];
  isPhaseOpen: boolean;
  onNominationSubmitted: () => Promise<void>;
  queryClient: QueryClient;
}>;

export function CategoryNominationCard({
  category,
  eventId,
  myStatus,
  approvedNominees,
  isPhaseOpen,
  onNominationSubmitted,
  queryClient,
}: CategoryNominationCardProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const titleTrimmed = title.trim();
  const isValidTitle = titleTrimmed.length >= 2 && titleTrimmed.length <= 120;
  const hasSubmittedNomination = Boolean(myStatus?.status || pendingLabel);

  const submitNomination = useMutation({
    mutationFn: () => awardsRepo.createNomination(eventId, { categoryId: category.id, title: titleTrimmed }),
    onMutate: async () => {
      const previousMyStatus = queryClient.getQueryData<MyNominationStatusDto | null>(["nominations", eventId, "my-status"]);
      const previousApproved = queryClient.getQueryData<NomineeDto[]>(["nominations", eventId, "approved"]);
      queryClient.setQueryData<MyNominationStatusDto | null>(["nominations", eventId, "my-status"], (current) => ({
        ...(current ?? { categoryId: null, nomineeId: null, nomineeTitle: null, status: null }),
        hasNomination: true,
        nomineeId: category.id,
        nomineeTitle: titleTrimmed,
        categoryId: category.id,
        status: "pending",
      }));
      setPendingLabel(titleTrimmed);
      setTitle("");
      setFile(null);
      return { previousApproved, previousMyStatus };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMyStatus !== undefined) {
        queryClient.setQueryData(["nominations", eventId, "my-status"], context.previousMyStatus);
      }
      if (context?.previousApproved !== undefined) {
        queryClient.setQueryData(["nominations", eventId, "approved"], context.previousApproved);
      }
      setPendingLabel(null);
      logFrontendError("CanhoesNominations.createNomination", error, { categoryId: category.id, eventId });
      toast.error(getErrorMessage(error, "Não foi possível submeter a nomeação."));
    },
    onSuccess: async (createdNominee) => {
      if (file) {
        try {
          await awardsRepo.uploadNomineeImage(eventId, createdNominee.id, file);
        } catch {
          toast.error("Nomeação criada, mas falhou o upload da imagem.");
        }
      }
      setPendingLabel(titleTrimmed);
      toast.success("Nomeação submetida. Aguarda aprovação.");
      await onNominationSubmitted();
    },
  });

  return (
    <CanhoesFeatureCard title={category.name} description={category.description ?? undefined} variant="official">
      {hasSubmittedNomination ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-[var(--neon-amber)] bg-[rgba(255,184,0,0.08)] text-[var(--neon-amber)]">
            <Clock className="mr-1 h-3.5 w-3.5" />
            Aguarda aprovação
          </Badge>
          <span className="text-sm font-medium text-[var(--ink-primary)]">{pendingLabel || "Já nomeaste nesta categoria"}</span>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="space-y-2">
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Nome da pessoa ou item" className="border-[var(--border-moss)] focus-visible:border-[var(--border-neon)]" maxLength={120} disabled={!isPhaseOpen || submitNomination.isPending} />
            <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
              <span>2 a 120 caracteres.</span>
              <span className="font-[var(--font-mono)]">{titleTrimmed.length}/120</span>
            </div>
            <CanhoesFileTrigger fileName={file?.name} onChange={setFile} placeholder="Adicionar imagem (opcional)" />
          </div>
          <Button type="button" onClick={() => submitNomination.mutate()} disabled={!isPhaseOpen || !isValidTitle || submitNomination.isPending} className="min-w-36" variant="default">
            {submitNomination.isPending ? "A submeter..." : "Submeter"}
          </Button>
        </div>
      )}
      <ApprovedNomineesList nominees={approvedNominees} />
    </CanhoesFeatureCard>
  );
}

function ApprovedNomineesList({ nominees }: Readonly<{ nominees: NomineeDto[] }>) {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--ink-primary)]">Nomeações aprovadas</h4>
        <span className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">{formatCount(nominees.length, "aprovada", "aprovadas")}</span>
      </div>
      {nominees.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">Ainda sem nomeações aprovadas nesta categoria oficial.</p>
      ) : (
        <VirtualizedList
          items={nominees}
          getKey={(nominee) => nominee.id}
          estimateSize={() => 52}
          className="max-h-[34svh]"
          renderItem={(nominee) => (
            <div className="canhoes-list-item flex items-center gap-2 rounded-[var(--radius-md-token)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 transition-colors duration-150 hover:border-[rgba(122,173,58,0.2)]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--neon-green)]" />
              <span className="truncate text-sm font-medium text-[var(--ink-primary)]">{nominee.title}</span>
            </div>
          )}
        />
      )}
    </div>
  );
}
