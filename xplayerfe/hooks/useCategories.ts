'use client';

import { useQuery } from '@tanstack/react-query';
import { xplayerFetch } from '@/lib/api';
import type { AwardCategoryDto } from '@/lib/api/types';

export function useCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['canhoes', 'categories'],
    // NOTE: xplayerFetch automatically routes through /api/proxy
    // so this path maps to backend: GET /api/canhoes/categories
    queryFn: () => xplayerFetch<AwardCategoryDto[]>('/canhoes/categories'),
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error,
  };
}
