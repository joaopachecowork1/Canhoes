
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { canhoesRepo } from '@/lib/repositories/canhoesRepo';
import type { CreateCategoryProposalRequest, CategoryProposalDto } from '@/lib/api/types';

export function useCategoryProposals(categoryId: string | number) {
  return useQuery<CategoryProposalDto[]>({
    queryKey: ['category-proposals', categoryId],
    // Backend does not expose proposals by category; keep compatibility by using admin endpoints
    // when available. If you need per-category proposals, add a dedicated endpoint.
    queryFn: async () => {
      const resp = await canhoesRepo.adminProposalsHistory();
      return resp?.categoryProposals ?? [];
    },
    enabled: !!categoryId,
  });
}

export function useCreateCategoryProposal(categoryId: string | number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCategoryProposalRequest & { title?: string }) =>
      canhoesRepo.createCategoryProposal({
        name: payload?.name ?? payload?.title ?? "",
        description: payload?.description ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['category-proposals', categoryId] });
    },
  });
}
