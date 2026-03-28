"use client";

import { AlertTriangle, CheckCircle, Trophy, Users, Vote } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/StatCard";
import { colors } from "@/lib/theme/tokens";
import type {
  AwardCategoryDto,
  CategoryProposalDto,
  MeasureProposalDto,
  NomineeDto,
  PublicUserDto,
} from "@/lib/api/types";

type AdminDashboardProps = {
  allNominees: NomineeDto[];
  categories: AwardCategoryDto[];
  loading: boolean;
  members: PublicUserDto[];
  pendingCategoryProposals: CategoryProposalDto[];
  pendingMeasureProposals: MeasureProposalDto[];
  pendingNominees: NomineeDto[];
  totalVotes: number;
};

function MetricSkeleton() {
  return (
    <div className="min-w-[148px] rounded-[var(--radius-md-token)] border border-[var(--color-beige-dark)]/20 bg-[var(--color-bg-card)] p-4">
      <Skeleton className="mb-3 h-10 w-10 rounded-full" />
      <Skeleton className="mb-2 h-7 w-16 rounded" />
      <Skeleton className="h-4 w-24 rounded" />
    </div>
  );
}

export function AdminDashboard({
  allNominees,
  categories,
  loading,
  members,
  pendingCategoryProposals,
  pendingMeasureProposals,
  pendingNominees,
  totalVotes,
}: Readonly<AdminDashboardProps>) {
  const safeCategories = categories ?? [];
  const safeAllNominees = allNominees ?? [];
  const safeMembers = members ?? [];
  const safePendingCategoryProposals = pendingCategoryProposals ?? [];
  const safePendingMeasureProposals = pendingMeasureProposals ?? [];
  const safePendingNominees = pendingNominees ?? [];

  const activeCategories = safeCategories.filter((category) => category.isActive).length;
  const approvedNominees = safeAllNominees.filter(
    (nominee) => nominee.status === "approved"
  ).length;
  const pendingReviews =
    safePendingNominees.length +
    safePendingCategoryProposals.length +
    safePendingMeasureProposals.length;

  const recentNominees = [...safeAllNominees]
    .sort(
      (left, right) =>
        new Date(right.createdAtUtc).getTime() -
        new Date(left.createdAtUtc).getTime()
    )
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="editorial-kicker">Resumo rapido</p>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <MetricSkeleton key={index} />
            ))
          ) : (
            <>
              <StatCard
                icon={<Trophy className="h-5 w-5" />}
                label="Categorias ativas"
                value={activeCategories}
                color={colors.mossLight}
                delay={0}
                className="shrink-0"
              />
              <StatCard
                icon={<CheckCircle className="h-5 w-5" />}
                label="Nomeacoes aprovadas"
                value={approvedNominees}
                color={colors.success}
                delay={80}
                className="shrink-0"
              />
              <StatCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Pendentes"
                value={pendingReviews}
                color={pendingReviews > 0 ? colors.warning : colors.success}
                delay={160}
                className="shrink-0"
              />
              <StatCard
                icon={<Vote className="h-5 w-5" />}
                label="Votos"
                value={totalVotes}
                color={colors.psycho4}
                delay={240}
                className="shrink-0"
              />
              <StatCard
                icon={<Users className="h-5 w-5" />}
                label="Membros"
                value={safeMembers.length}
                color={colors.beige}
                delay={320}
                className="shrink-0"
              />
            </>
          )}
        </div>
      </div>

      {!loading && pendingReviews > 0 ? (
        <section className="editorial-shell rounded-[var(--radius-lg-token)] px-4 py-4 sm:px-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--color-brown)]">
              <AlertTriangle className="h-4 w-4" />
              <span className="editorial-kicker">Atencao</span>
            </div>

            <div className="space-y-2">
              <h3 className="heading-3 text-[var(--color-text-primary)]">
                Existem blocos a precisar de moderacao
              </h3>
              <div className="flex flex-wrap gap-2">
                {safePendingNominees.length > 0 ? (
                  <Badge variant="secondary">
                    {safePendingNominees.length} nomeacoes pendentes
                  </Badge>
                ) : null}
                {safePendingCategoryProposals.length > 0 ? (
                  <Badge variant="secondary">
                    {safePendingCategoryProposals.length} propostas de categoria
                  </Badge>
                ) : null}
                {safePendingMeasureProposals.length > 0 ? (
                  <Badge variant="secondary">
                    {safePendingMeasureProposals.length} medidas propostas
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && recentNominees.length > 0 ? (
        <section className="space-y-3">
          <div className="space-y-1">
            <p className="editorial-kicker">Atividade recente</p>
            <h3 className="heading-3 text-[var(--color-text-primary)]">
              Ultimas nomeacoes recebidas
            </h3>
          </div>

          <div className="space-y-3">
            {recentNominees.map((nominee) => (
              <article
                key={nominee.id}
                className="editorial-shell rounded-[var(--radius-md-token)] px-4 py-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-[var(--color-text-primary)]">
                      {nominee.title}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(nominee.createdAtUtc).toLocaleDateString("pt-PT", {
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </div>

                  <Badge
                    variant={
                      nominee.status === "approved"
                        ? "default"
                        : nominee.status === "rejected"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {nominee.status}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
