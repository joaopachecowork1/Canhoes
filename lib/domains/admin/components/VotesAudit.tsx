"use client";

import { useMemo, useState } from "react";
import { History, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import type { AdminVoteAuditRowDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminStateMessage } from "./layout/AdminStateMessage";
import { ADMIN_CONTENT_CARD_CLASS } from "./adminContentUi";
import { formatDateTimeUtc } from "./dateUtils";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.admin.VotesAudit;

type VotesAuditProps = {
  eventId: string | null;
};

// Linhas separadas por uma linha fina; a última não leva separador
const VOTE_ROW_CLASS =
  "flex w-full flex-col gap-1 border-b border-[var(--border-subtle)] bg-[var(--bg-paper)] px-4 py-3 last:border-0";
const EMPTY_ADMIN_VOTES: AdminVoteAuditRowDto[] = [];

/** Indica se o nome do utilizador, da categoria ou do nomeado contém o termo (já em minúsculas). */
function matchesVoteFilter(vote: AdminVoteAuditRowDto, term: string) {
  return [vote.userName, vote.categoryName, vote.nomineeName].some((value) => value.toLowerCase().includes(term));
}

/** Uma linha da auditoria: quem votou, quando e em quem, dentro de que categoria. */
function VoteRow({ vote }: Readonly<{ vote: AdminVoteAuditRowDto }>) {
  return (
    <div className={VOTE_ROW_CLASS}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">{vote.userName}</p>
        <span className="shrink-0 text-xs tabular-nums text-[var(--ink-muted)]">
          {formatDateTimeUtc(vote.updatedAtUtc)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Badge variant="outline" className="h-5 px-1.5 text-xs">
          {vote.categoryName}
        </Badge>
        <span className="text-xs text-[var(--ink-muted)]">{copy.chose}</span>
        <span className="text-xs font-medium text-[var(--ink-primary)]">{vote.nomineeName}</span>
      </div>
    </div>
  );
}

/** Lista de votos, ou a mensagem de "sem resultados" quando o filtro não apanha nenhum. */
function VoteList({ votes }: Readonly<{ votes: AdminVoteAuditRowDto[] }>) {
  if (votes.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-[var(--ink-muted)]">{copy.noMatch}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {votes.map((vote) => (
        <VoteRow key={`${vote.userId}-${vote.categoryId}`} vote={vote} />
      ))}
    </div>
  );
}

/** Auditoria de votos do admin: lista todos os votos do evento com um filtro por texto. */
export function VotesAudit({ eventId }: Readonly<VotesAuditProps>) {
  const [filter, setFilter] = useState("");

  // 1000 votos de uma vez: o filtro corre no cliente
  const votesQuery = useQuery({
    enabled: Boolean(eventId),
    queryFn: () => adminRepo.getVotesPaged(eventId ?? "", 0, 1000),
    queryKey: queryKeys.admin.votesAudit(eventId),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const filteredVotes = useMemo(() => {
    const votes = votesQuery.data?.votes ?? EMPTY_ADMIN_VOTES;
    const term = filter.trim().toLowerCase();
    if (!term) return votes;
    return votes.filter((vote) => matchesVoteFilter(vote, term));
  }, [votesQuery.data?.votes, filter]);

  if (!eventId) {
    return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;
  }

  if (votesQuery.isLoading) {
    return <AdminStateMessage>{copy.loading}</AdminStateMessage>;
  }

  if (votesQuery.error) {
    return <AdminStateMessage tone="error">{copy.loadError}</AdminStateMessage>;
  }

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              {copy.title}
            </CardTitle>
            <p className="text-sm text-[var(--ink-muted)]">{copy.description}</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)]" />
            <Input
              placeholder={copy.filterPlaceholder}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <VoteList votes={filteredVotes} />
        </CardContent>
      </Card>
    </div>
  );
}
