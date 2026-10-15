"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Cigarette } from "lucide-react";
import { toast } from "sonner";

import type { EventActiveContextDto, AwardCategoryDto, NomineeDto } from "@/lib/api/types";
import {
  CanhoesFileTrigger,
  CanhoesMediaThumb,
  CanhoesModuleHeader,
  formatEventPhaseLabel,
} from "@/components/modules/canhoes/CanhoesModuleParts";
import { StickerFeedList } from "./StickerFeedList";
import { useEventOverview } from "@/hooks/useEventOverview";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";


import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function StickerSubmitLoadingState() {
  return (
    <div className="space-y-4">
      <div className="page-hero px-4 py-4 sm:px-5 sm:py-5">
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
          <div key={index} className="space-y-3 rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(22,28,15,0.9)] p-3">
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

export function CanhoesStickerSubmitModule({ initialContext, initialStickerCategories, initialApprovedNominees }: {
    initialContext?: EventActiveContextDto | null;
    initialStickerCategories?: AwardCategoryDto[];
    initialApprovedNominees?: NomineeDto[];
}) {
  const { overview, event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const queryClient = useQueryClient();

  const { data: categoryList = [], isLoading: isCategoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["stickerCategories", eventId],
    queryFn: () => awardsRepo.getCategories(eventId!).then(r => r.items),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialStickerCategories,
  });

  const { data: nomineeList = [], isLoading: isNomineesLoading, error: nomineesError } = useQuery({
    queryKey: ["approvedNominees", eventId],
    queryFn: () => awardsRepo.getApprovedNominees(eventId!),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialApprovedNominees,
  });

  const isLoading = isCategoriesLoading || isNomineesLoading;
  const error = categoriesError || nomineesError;
  const errorMessage = error ? getErrorMessage(error, "Não foi possível carregar os stickers desta edição.") : null;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [stickerTitle, setStickerTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState("");

  useEffect(() => {
    if (!selectedFile) {
      setSelectedFilePreviewUrl("");
      return;
    }
    const previewUrl = URL.createObjectURL(selectedFile);
    setSelectedFilePreviewUrl(previewUrl);
    return () => { URL.revokeObjectURL(previewUrl); };
  }, [selectedFile]);

  const phaseType = overview?.activePhase?.type;
  const nominationPhase = phaseType === "PROPOSALS";
  const canSubmit = stickerTitle.trim().length >= 2;
  const submitButtonLabel = nominationPhase
    ? isSubmitting
      ? "A submeter..."
      : "Submeter sticker"
    : "Nomeações fechadas";

  const stickersWithImage = nomineeList.filter((nominee) => nominee.imageUrl);

  const isInitialLoading = isLoading && categoryList.length === 0 && nomineeList.length === 0;

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Só podes enviar imagens");
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error("A imagem excede 15MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!nominationPhase || !canSubmit || !eventId) return;

    setIsSubmitting(true);

    try {
      const createdNominee = await awardsRepo.createNomination(eventId, {
        categoryId: selectedCategoryId || null,
        title: stickerTitle.trim(),
        kind: "stickers",
      });

      if (selectedFile) {
        await awardsRepo.uploadNomineeImage(eventId, createdNominee.id, selectedFile);
      }

      setStickerTitle("");
      setSelectedFile(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stickerCategories", eventId] }),
        queryClient.invalidateQueries({ queryKey: ["approvedNominees", eventId] }),
      ]);
      toast.success("Sticker submetido");
    } catch (error) {
      const message = getErrorMessage(
        error,
        "Não foi possível submeter o sticker."
      );
      logFrontendError("CanhoesStickerSubmit.handleSubmit", error);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <section className="page-hero px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[var(--color-title)]">
            <Cigarette className="h-4 w-4 text-[var(--color-fire)]" />
            <span className="editorial-kicker">Sticker do ano</span>
          </div>
          <CanhoesModuleHeader
            icon={Cigarette}
            title="Arquivo de stickers"
            description="Escolhe a imagem do teu sticker do ano, confirma a pré-visualização e submete-a para aprovação."
            badgeLabel={
              phaseType ? `Fase: ${formatEventPhaseLabel(phaseType)}` : undefined
            }
          />
        </div>
      </section>

      <Card>
        <CardHeader className="space-y-1">
          <p className="editorial-kicker">Submissão</p>
          <CardTitle>Enviar um novo sticker</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorMessage ? (
            <ErrorAlert
              title="Erro ao carregar stickers"
              description={errorMessage}
              actionLabel="Tentar novamente"
              onAction={() => void (eventId ? queryClient.invalidateQueries({ queryKey: ["stickerCategories", eventId] }) : Promise.resolve())}
            />
          ) : null}

          {isInitialLoading ? <StickerSubmitLoadingState /> : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <span id="sticker-category-label" className="canhoes-field-label">Categoria</span>
              <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId} aria-labelledby="sticker-category-label">
                <SelectTrigger>
                  <SelectValue placeholder="Escolhe a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryList.filter(c => c.kind === 2).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="sticker-title-input" className="canhoes-field-label">Título</label>
              <Input
                id="sticker-title-input"
                value={stickerTitle}
                onChange={(event) => setStickerTitle(event.target.value)}
                placeholder="Ex: O sticker mais lendário"
              />
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="space-y-3">
              <p className="canhoes-field-label">Imagem</p>
              <CanhoesFileTrigger
                className="gap-3 rounded-[var(--radius-md-token)] border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]"
                fileName={selectedFile?.name}
                iconClassName="text-[var(--neon-cyan)]"
                onChange={handleFileChange}
                placeholder="Adicionar imagem (opcional)"
              />
              <p className="canhoes-helper-text">
                Preview local antes do submit. O sticker fica pendente até um
                admin aprovar.
              </p>
            </div>

            <div className="rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-panel)]">
              <CanhoesMediaThumb
                alt={selectedFile?.name ?? "Preview do sticker"}
                src={selectedFilePreviewUrl}
                normalizeSrc={false}
                frameClassName="aspect-square h-auto w-full rounded-[calc(var(--radius-md-token)-4px)] bg-[var(--color-bg-surface)]"
                imageClassName="h-full w-full object-cover"
                iconClassName="h-6 w-6"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="canhoes-helper-text">
              O upload usa o mesmo padrão de média do feed para evitar URLs
              partidas depois de guardar.
            </p>

            <Button
              type="button"
              variant="default"
              disabled={!nominationPhase || !canSubmit || isSubmitting}
              onClick={() => void handleSubmit()}
              className="w-full sm:w-auto"
            >
              {submitButtonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="editorial-kicker">Galeria</p>
            <h2 className="heading-3 text-[var(--color-text-primary)]">
              Stickers submetidos
            </h2>
          </div>
          <Badge variant="secondary">{stickersWithImage.length}</Badge>
        </div>

        {!isLoading && !errorMessage ? (
          <div className="pt-4">
            <StickerFeedList stickers={stickersWithImage} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
