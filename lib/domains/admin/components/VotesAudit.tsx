"use client";

import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { AdminVoteAuditRowDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VirtualizedList } from "@/components/ui/virtualized-list";
import { AdminStateMessage } from "./layout/AdminStateMessage";
import { ADMIN_CONTENT_CARD_CLASS } from "./adminContentUi";
import { formatDateTimeUtc } from "./dateUtils";

type VotesAuditProps = {
  eventId: string | null;
};

const VOTE_ROW_CLASS =
  "flex w-full flex-col gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-paper)] px-4 py-3 last:border-0";
const EMPTY_ADMIN_VOTES: AdminVoteAuditRowDto[] = [];

export function VotesAudit({ eventId }: Readonly<VotesAuditProps>) {
  const [filter, setFilter] = useState("");

  const votesQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getVotesPaged(eventId!, 0, 1000),
    queryKey: ["canhoes", "admin", "votes-audit", eventId],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const filteredVotes = useMemo(() => {
    const votes = votesQuery.data?.votes ?? EMPTY_ADMIN_VOTES;
    const term = filter.trim().toLowerCase();
    if (!term) return votes;
    return votes.filter(
      (vote) =>
        vote.userName.toLowerCase().includes(term) ||
        vote.categoryName.toLowerCase().includes(term) ||
        vote.nomineeName.toLowerCase().includes(term)
    );
  }, [votesQuery.data?.votes, filter]);

  if (!eventId) {
    return <AdminStateMessage>Falta uma edição ativa para consultar auditoria.</AdminStateMessage>;
  }

  if (votesQuery.isLoading) {
    return <AdminStateMessage>A carregar auditoria de votos...</AdminStateMessage>;
  }

  if (votesQuery.error) {
    return (
      <AdminStateMessage tone="error">
        Não foi possível carregar a auditoria de votos.
      </AdminStateMessage>
    );
  }

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <p className="editorial-kicker">Auditoria</p>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de votos
            </CardTitle>
            <p className="text-sm text-[var(--ink-muted)]">
              Lista crua de todos os votos submetidos para garantir transparência operacional.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <Input
              placeholder="Filtrar por membro, categoria ou opção..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredVotes.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[var(--ink-muted)]">
                Nenhum voto corresponde ao filtro aplicado.
              </p>
            </div>
          ) : (
            <VirtualizedList
              items={filteredVotes}
              getKey={(vote) => `${vote.userId}-${vote.categoryId}`}
              estimateSize={() => 82}
              className="max-h-[60svh]"
              renderItem={(vote) => (
                <div className={VOTE_ROW_CLASS}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">
                      {vote.userName}
                    </p>
                    <span className="shrink-0 text-[10px] tabular-nums text-[var(--ink-muted)]">
                      {formatDateTimeUtc(vote.updatedAtUtc)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      {vote.categoryName}
                    </Badge>
                    <span className="text-xs text-[var(--ink-muted)]">escolheu</span>
                    <span className="text-xs font-medium text-[var(--ink-primary)]">
                      {vote.nomineeName}
                    </span>
                  </div>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
