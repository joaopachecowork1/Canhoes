"use client";

import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { AwardCategoryDto } from "@/lib/api/types";

type VoteAuditRow = {
  categoryId: string;
  nomineeId: string;
  userId: string;
  updatedAtUtc: string;
};

type Props = {
  votes: VoteAuditRow[];
  categories: AwardCategoryDto[];
  loading: boolean;
};

const MAX_DISPLAY = 200;

export function VotesAudit({ votes, categories, loading }: Readonly<Props>) {
  const [search, setSearch] = useState("");

  const categoryMap = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  const filteredVotes = useMemo(() => {
    if (!search.trim()) return votes.slice(0, MAX_DISPLAY);

    const normalizedTerm = search.toLowerCase();
    return votes
      .filter(
        (vote) =>
          vote.nomineeId.toLowerCase().includes(normalizedTerm) ||
          vote.userId.toLowerCase().includes(normalizedTerm) ||
          categoryMap.get(vote.categoryId)?.toLowerCase().includes(normalizedTerm)
      )
      .slice(0, MAX_DISPLAY);
  }, [votes, search, categoryMap]);

  return (
    <Card className="border-[var(--color-moss)]/20">
      <CardHeader className="space-y-1">
        <p className="editorial-kicker">Auditoria</p>
        <CardTitle>Historico de votos</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="body-small text-[var(--color-text-muted)]">
            A carregar auditoria...
          </div>
        ) : votes.length === 0 ? (
          <div className="body-small text-[var(--color-text-muted)]">
            Ainda nao ha votos registados.
          </div>
        ) : (
          <>
            <Input
              placeholder="Pesquisar por categoria, nominee ou utilizador..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />

            <div className="body-small text-[var(--color-text-muted)]">
              {filteredVotes.length} de {votes.length} votos
              {filteredVotes.length >= MAX_DISPLAY
                ? ` (mostrando no maximo ${MAX_DISPLAY})`
                : ""}
            </div>

            <Separator />

            <div className="space-y-3">
              {filteredVotes.map((vote, index) => (
                <article
                  key={`${vote.userId}:${vote.categoryId}:${index}`}
                  className="editorial-shell rounded-[var(--radius-md-token)] px-4 py-4"
                >
                  <div className="space-y-2">
                    <p className="font-semibold text-[var(--color-text-primary)]">
                      {categoryMap.get(vote.categoryId) ?? vote.categoryId}
                    </p>
                    <div className="space-y-1 text-sm text-[var(--color-text-secondary)]">
                      <p>Nominee: {vote.nomineeId}</p>
                      <p>Utilizador: {vote.userId}</p>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {new Date(vote.updatedAtUtc).toLocaleString("pt-PT")}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
