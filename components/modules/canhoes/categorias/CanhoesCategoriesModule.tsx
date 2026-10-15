"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Inbox, Search, Trophy } from "lucide-react";
import { toast } from "sonner";

import type { EventActiveContextDto, AwardCategoryDto } from "@/lib/api/types";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { useEventOverview } from "@/hooks/useEventOverview";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { getPhaseLabel } from "@/lib/canhoesEvent";

import { CanhoesDecorativeDivider } from "@/components/ui/canhoes-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

function CategoriesLoadingState() {
    return (
        <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, index) => (
                <div
                    key={index}
                    className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-[var(--bg-paper-soft)] p-4"
                >
                    <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/5 rounded" />
                        <Skeleton className="h-3 w-4/5 rounded" />
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                </div>
            ))}
        </div>
    );
}

/** Categorias page: the edition's categories and the form to propose a new one. */
export function CanhoesCategoriesModule({ initialContext, initialCategories }: {
    initialContext?: EventActiveContextDto | null;
    initialCategories?: AwardCategoryDto[];
}) {
    const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
    const queryClient = useQueryClient();

    const { data: categoryList = [], isLoading, error } = useQuery({
        queryKey: ["categories", event?.id],
        queryFn: () => awardsRepo.getCategories(event!.id).then(r => r.items),
        enabled: !!event?.id,
        staleTime: 1000 * 60 * 2,
        initialData: initialCategories,
    });

    const errorMessage = error ? getErrorMessage(error, "Não foi possível carregar as categorias desta edição.") : null;

    const [search, setSearch] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [categoryDescription, setCategoryDescription] = useState("");
    const [categoryKind, setCategoryKind] = useState("0");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmitProposal =
        categoryName.trim().length >= 3 && Boolean(overview?.permissions.canSubmitProposal);
    let submitButtonLabel = "Propostas fechadas";
    if (overview?.permissions.canSubmitProposal) {
        submitButtonLabel = "Propor";
    }
    if (isSubmitting) {
        submitButtonLabel = "A enviar...";
    }

    const filteredCategoryList = categoryList.filter((category) =>
        search.trim()
            ? `${category.name} ${category.description ?? ""}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())
            : true
    );

    const handleProposalSubmit = async () => {
        if (!canSubmitProposal || !event) return;

        setIsSubmitting(true);
        try {
            await awardsRepo.createCategoryProposal(event.id, {
                description: categoryDescription.trim() || null,
                name: categoryName.trim(),
                kind: parseInt(categoryKind, 10),
            });

            setCategoryName("");
            setCategoryDescription("");
            setCategoryKind("0");
            await queryClient.invalidateQueries({ queryKey: ["categories", event.id] });
            toast.success("Proposta enviada");
        } catch (error) {
            const message = getErrorMessage(
                error,
                "Não foi possível enviar a proposta de categoria."
            );
            logFrontendError("CanhoesCategories.handleProposalSubmit", error, {
                eventId: event.id,
            });
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            {/* ── Sticky header com backdrop blur ── */}
            <div className="sticky top-0 z-10 -mx-4 px-4 pb-4 pt-2 backdrop-blur-xl bg-[var(--bg-void)]/80 border-b border-white/5">
                <CanhoesModuleHeader
                    icon={Flame}
                    title="Categorias oficiais"
                    description="Consulta as categorias oficiais e propõe novas enquanto a fase de propostas estiver aberta."
                    badgeLabel={
                        overview
                            ? `Fase: ${getPhaseLabel(overview.activePhase?.type)}`
                            : undefined
                    }
                />
            </div>

            {/* ── Propor categoria ── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-fire)]/12">
                            <Trophy className="h-4 w-4 text-[var(--color-fire)]" />
                        </div>
                        Propor categoria oficial
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                        <div className="space-y-2">
                            <label htmlFor="category-name-input" className="canhoes-field-label">Nome</label>
                            <Input
                                id="category-name-input"
                                value={categoryName}
                                onChange={(event) => setCategoryName(event.target.value)}
                                placeholder="Ex.: Melhor sticker de sempre"
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="category-kind-input" className="canhoes-field-label">Como se vota</label>
                            <Select value={categoryKind} onValueChange={setCategoryKind}>
                                <SelectTrigger id="category-kind-input">
                                    <SelectValue placeholder="Selecione o formato" />
                                </SelectTrigger>
                                <SelectContent className="z-[100]">
                                    <SelectItem value="0">Vota-se nas nomeações</SelectItem>
                                    <SelectItem value="1">Vota-se num membro</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label htmlFor="category-desc-input" className="canhoes-field-label">Descrição</label>
                            <Textarea
                                id="category-desc-input"
                                value={categoryDescription}
                                onChange={(event) => setCategoryDescription(event.target.value)}
                                placeholder="Dá contexto ao canhão..."
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="canhoes-helper-text">A proposta entra em revisão antes de ficar oficial.</p>
                        <Button disabled={!canSubmitProposal || isSubmitting} onClick={() => void handleProposalSubmit()}>
                            {submitButtonLabel}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Lista de categorias ── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle>Categorias oficiais</CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                    {/* Search com ícone */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Procurar categoria oficial"
                            className="h-10 pl-9"
                        />
                    </div>

                    {errorMessage ? (
                        <ErrorAlert
                            title="Erro ao carregar categorias oficiais"
                            description={errorMessage}
                            actionLabel="Tentar novamente"
                            tone="official"
                            onAction={() => void (event ? queryClient.invalidateQueries({ queryKey: ["categories", event.id] }) : Promise.resolve())}
                        />
                    ) : null}

                    {isLoading && filteredCategoryList.length === 0 ? (
                        <CategoriesLoadingState />
                    ) : null}

                    {!isLoading && !isOverviewLoading && !errorMessage && filteredCategoryList.length === 0 ? (
                        <EmptyState
                            icon={Inbox}
                            title="Sem categorias oficiais"
                            description="Ainda não há categorias oficiais nesta edição."
                            tone="official"
                        />
                    ) : null}

                    {filteredCategoryList.length > 0 ? (
                        <div className="space-y-2.5">
                            {filteredCategoryList.map((category, index) => (
                                <div
                                    key={category.id}
                                    className="flex items-center gap-3.5 rounded-2xl border border-white/5 bg-[var(--bg-paper-soft)] p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/[0.06] animate-fade-slide-up"
                                    style={{ "--item-index": index } as CSSProperties}
                                >
                                    {/* Ícone translúcido */}
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--moss)]/12">
                                        <Trophy className="h-5 w-5 text-[var(--moss-glow)]" />
                                    </div>

                                    {/* Conteúdo textual */}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-[var(--ink-primary)]">
                                            {category.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-[var(--ink-secondary)]">
                                            {category.description || "Sem descrição adicional."}
                                        </p>
                                    </div>

                                    {/* Badge de estado */}
                                    <Badge variant={category.isActive ? "default" : "outline"}>
                                        {category.isActive ? "Ativa" : "Inativa"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    {filteredCategoryList.length > 0 ? (
                        <CanhoesDecorativeDivider tone="moss" />
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
