"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthContext";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.admin.AdminMembersSection;
const QUERY_OPTIONS = { refetchOnWindowFocus: false, staleTime: 1000 * 60 * 2 } as const;

/** Members and secret santa state of the edition, and the admin switch per member. */
export function useAdminMembers(eventId: string | null) {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const id = eventId ?? "";

  const membersQuery = useQuery({
    ...QUERY_OPTIONS,
    enabled: !!eventId,
    queryFn: () => adminRepo.getMembersPaged(id, 0, 50),
    queryKey: queryKeys.admin.membersPage(eventId, 0, 50),
    select: (page) => page.items,
  });

  const secretSantaQuery = useQuery({
    ...QUERY_OPTIONS,
    enabled: !!eventId,
    queryFn: () => adminRepo.getSecretSantaState(id),
    queryKey: queryKeys.admin.secretSantaState(eventId),
  });

  const roleMutation = useMutation({
    mutationFn: async (member: { id: string; isAdmin: boolean }) => {
      const isSelfDemotion = member.id === user?.id && member.isAdmin;
      if (isSelfDemotion && !window.confirm(copy.selfDemotionConfirm)) return null;
      return adminRepo.setMemberAdmin(id, member.id, { isAdmin: !member.isAdmin, confirmSelfDemotion: isSelfDemotion });
    },
    onSuccess: async (result) => {
      if (!result) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.admin.members(eventId) }),
        refreshProfile(),
      ]);
      toast.success(copy.rolesUpdated);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : copy.roleError),
  });

  return {
    members: membersQuery.data ?? [],
    secretSantaState: secretSantaQuery.data,
    isLoading: membersQuery.isLoading || secretSantaQuery.isLoading,
    queryError: membersQuery.error ?? secretSantaQuery.error,
    refetchAll: () => Promise.all([membersQuery.refetch(), secretSantaQuery.refetch()]),
    roleMutation,
  };
}
