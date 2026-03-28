"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { canhoesRepo } from "@/lib/repositories/canhoesRepo";
import { RefreshCw, Shield } from "lucide-react";
import { toast } from "sonner";

import type {
  AwardCategoryDto,
  CanhoesStateDto,
  CategoryProposalDto,
  MeasureProposalDto,
  NomineeDto,
  PublicUserDto,
} from "@/lib/api/types";

import { AdminDashboard } from "./components/AdminDashboard";
import { CategoriesAdmin } from "./components/CategoriesAdmin";
import { EventStateCard } from "./components/EventStateCard";
import { NomineesAdmin } from "./components/NomineesAdmin";
import { PendingProposals } from "./components/PendingProposals";
import { UsersAdmin } from "./components/UsersAdmin";
import { VotesAudit } from "./components/VotesAudit";

type VoteAuditRow = {
  categoryId: string;
  nomineeId: string;
  userId: string;
  updatedAtUtc: string;
};

type ProposalsPayload<T> =
  | T[]
  | {
      pending?: T[];
      approved?: T[];
      rejected?: T[];
    }
  | null
  | undefined;

function normalizeProposals<T>(payload: ProposalsPayload<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const grouped = payload as { pending?: T[]; approved?: T[]; rejected?: T[] };
  return [
    ...(Array.isArray(grouped.pending) ? grouped.pending : []),
    ...(Array.isArray(grouped.approved) ? grouped.approved : []),
    ...(Array.isArray(grouped.rejected) ? grouped.rejected : []),
  ];
}

const EMPTY_PENDING = {
  nominees: [],
  categoryProposals: [],
  measureProposals: [],
};
const EMPTY_HISTORY = { categoryProposals: [], measureProposals: [] };
const EMPTY_VOTES = { votes: [] };
const EMPTY_MEASURES: MeasureProposalDto[] = [];

const safe = async <T,>(promise: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await promise;
  } catch {
    return fallback;
  }
};

export default function CanhoesAdminModule() {
  const [state, setState] = useState<CanhoesStateDto | null>(null);
  const [categories, setCategories] = useState<AwardCategoryDto[]>([]);
  const [allNominees, setAllNominees] = useState<NomineeDto[]>([]);
  const [pendingNominees, setPendingNominees] = useState<NomineeDto[]>([]);
  const [pendingCategoryProposals, setPendingCategoryProposals] = useState<
    CategoryProposalDto[]
  >([]);
  const [pendingMeasureProposals, setPendingMeasureProposals] = useState<
    MeasureProposalDto[]
  >([]);
  const [votes, setVotes] = useState<VoteAuditRow[]>([]);
  const [allCategoryProposals, setAllCategoryProposals] = useState<
    CategoryProposalDto[]
  >([]);
  const [allMeasureProposals, setAllMeasureProposals] = useState<
    MeasureProposalDto[]
  >([]);
  const [members, setMembers] = useState<PublicUserDto[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        nextState,
        nextCategories,
        pendingPayload,
        nextNominees,
        votesPayload,
        historyPayload,
        measuresPayload,
        membersPayload,
      ] = await Promise.all([
        safe<CanhoesStateDto | null>(canhoesRepo.getState(), null),
        safe<AwardCategoryDto[]>(canhoesRepo.adminGetAllCategories(), []),
        safe<{
          nominees: NomineeDto[];
          categoryProposals: CategoryProposalDto[];
          measureProposals: MeasureProposalDto[];
        }>(canhoesRepo.adminPending(), EMPTY_PENDING),
        safe<NomineeDto[]>(canhoesRepo.adminGetAllNominees(), []),
        safe<{ votes: VoteAuditRow[] }>(canhoesRepo.adminVotes(), EMPTY_VOTES),
        safe<{
          categoryProposals: ProposalsPayload<CategoryProposalDto>;
          measureProposals: ProposalsPayload<MeasureProposalDto>;
        }>(canhoesRepo.adminProposalsHistory(), EMPTY_HISTORY),
        safe<MeasureProposalDto[]>(
          canhoesRepo.adminListMeasureProposals(),
          EMPTY_MEASURES
        ),
        safe<PublicUserDto[]>(canhoesRepo.getMembers(), []),
      ]);

      setState(nextState);
      setCategories(nextCategories);
      setAllNominees(nextNominees);
      setPendingNominees(pendingPayload.nominees ?? []);
      setPendingCategoryProposals(pendingPayload.categoryProposals ?? []);
      setPendingMeasureProposals(
        (pendingPayload.measureProposals ?? []).filter(
          (proposal) => proposal.status === "pending"
        )
      );
      setVotes(votesPayload.votes ?? []);
      setAllCategoryProposals(
        normalizeProposals(historyPayload.categoryProposals)
      );
      setMembers(membersPayload ?? []);

      const fallbackMeasures = Array.isArray(historyPayload.measureProposals)
        ? (historyPayload.measureProposals as MeasureProposalDto[])
        : normalizeProposals(historyPayload.measureProposals);

      setAllMeasureProposals(
        (measuresPayload?.length ?? 0) > 0 ? measuresPayload : fallbackMeasures
      );
    } catch (error) {
      console.error("Admin load error:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingReviewCount =
    pendingNominees.length +
    pendingCategoryProposals.length +
    pendingMeasureProposals.length;

  const adminTabs = [
    { value: "dashboard", label: "Painel" },
    { value: "nominees", label: "Nomeacoes", count: pendingNominees.length },
    { value: "pending", label: "Propostas", count: pendingReviewCount },
    { value: "state", label: "Estado" },
    { value: "categories", label: "Categorias" },
    { value: "users", label: "Membros" },
    { value: "audit", label: "Auditoria", count: votes.length },
  ] as const;

  return (
    <div className="space-y-5">
      <section className="rounded-[var(--radius-lg-token)] border border-[var(--color-moss)]/20 bg-[var(--color-bg-card)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2 text-[var(--color-title)]">
              <Shield className="h-4 w-4" />
              <span className="label">Admin</span>
            </div>
            <div className="space-y-1">
              <h2 className="heading-2 text-[var(--color-text-primary)]">
                Centro de controlo do evento
              </h2>
              <p className="body-small max-w-xl text-[var(--color-text-muted)]">
                Aprova propostas, ajusta fases e acompanha o estado do evento com
                mais espaco e menos blocos empilhados sem respiracao.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className="border-[var(--color-moss)]/30 text-[var(--color-text-primary)]"
              >
                {categories.length} categorias
              </Badge>
              <Badge
                variant="outline"
                className="border-[var(--color-moss)]/30 text-[var(--color-text-primary)]"
              >
                {members.length} membros
              </Badge>
              {pendingReviewCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="bg-[var(--color-brown)] text-[var(--color-text-primary)]"
                >
                  {pendingReviewCount} pendentes
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 self-start">
            <Badge
              variant="outline"
              className="border-primary/40 px-3 text-primary"
            >
              Admin
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
          </div>
        </div>
      </section>

      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="gap-2 border border-[var(--color-moss)]/15 bg-[var(--color-bg-surface-alt)] p-1.5">
          {adminTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="px-3 py-2.5"
            >
              <span>{tab.label}</span>
              {tab.count && tab.count > 0 ? (
                <Badge
                  variant="secondary"
                  className="min-w-5 justify-center rounded-full bg-[var(--color-brown)] px-1.5 text-[11px] text-[var(--color-text-primary)]"
                >
                  {tab.count}
                </Badge>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <AdminDashboard
            categories={categories}
            allNominees={allNominees}
            pendingNominees={pendingNominees}
            pendingCategoryProposals={pendingCategoryProposals}
            pendingMeasureProposals={pendingMeasureProposals}
            members={members}
            totalVotes={votes.length}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="nominees" className="space-y-4">
          <NomineesAdmin
            nominees={allNominees}
            categories={categories}
            loading={loading}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <PendingProposals
            categoryProposals={pendingCategoryProposals}
            measureProposalsAll={allMeasureProposals}
            loading={loading}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="state" className="space-y-4">
          <EventStateCard
            state={state}
            categories={categories}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoriesAdmin
            categories={categories}
            categoryProposals={allCategoryProposals}
            measureProposals={allMeasureProposals}
            loading={loading}
            onUpdate={loadData}
          />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UsersAdmin members={members} loading={loading} />
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <VotesAudit votes={votes} categories={categories} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
