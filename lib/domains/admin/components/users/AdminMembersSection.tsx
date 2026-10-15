"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logFrontendError } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { useAuth } from "@/components/providers/AuthContext";

import { AdminStateMessage } from "../layout/AdminStateMessage";
import { SecretSantaAdmin } from "./SecretSantaAdmin";
import { AdminInviteUser } from "./AdminInviteUser";
import { AdminMembersDataTable } from "./AdminMembersDataTable";

type AdminMembersSectionProps = {
  eventId: string | null;
  loading: boolean;
  onUpdate: () => Promise<void>;
};

export function AdminMembersSection({
  eventId,
  loading,
  onUpdate,
}: Readonly<AdminMembersSectionProps>) {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const membersQuery = useQuery({
    enabled: !!eventId,
    queryFn: () => adminRepo.getMembersPaged(eventId!, 0, 50),
    queryKey: ["canhoes", "admin", "members", eventId, 0, 50],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
    select: (page) => page.items,
  });

  const secretSantaQuery = useQuery({
    enabled: !!eventId,
    queryFn: () => adminRepo.getSecretSantaState(eventId!),
    queryKey: ["canhoes", "admin", "secret-santa-state", eventId],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const members = membersQuery.data ?? [];
  const roleMutation = useMutation({
    mutationFn: async (member: { id: string; isAdmin: boolean }) => {
      const isSelfDemotion = member.id === user?.id && member.isAdmin;
      if (isSelfDemotion && !window.confirm("Ao remover o teu acesso admin sairás desta área. Continuar?")) {
        return null;
      }
      return adminRepo.setMemberAdmin(eventId!, member.id, {
        isAdmin: !member.isAdmin,
        confirmSelfDemotion: isSelfDemotion,
      });
    },
    onSuccess: async (result) => {
      if (!result) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["canhoes", "admin", "members", eventId] }),
        refreshProfile(),
      ]);
      toast.success("Permissões atualizadas.");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o admin."),
  });

  if (!eventId) {
    return <AdminStateMessage>Falta uma edicao ativa para gerir amigos.</AdminStateMessage>;
  }

  if (loading || membersQuery.isLoading || secretSantaQuery.isLoading) {
    return <AdminStateMessage>A carregar membros...</AdminStateMessage>;
  }

  const queryError = membersQuery.error ?? secretSantaQuery.error;

  if (queryError) {
    logFrontendError("AdminMembersSection.query", queryError, { eventId });
    return (
      <AdminStateMessage
        tone="error"
        action={
          <Button onClick={() => void Promise.all([membersQuery.refetch(), secretSantaQuery.refetch()])}>
            Tentar novamente
          </Button>
        }
      >
        Nao foi possivel carregar os membros desta edicao.
      </AdminStateMessage>
    );
  }

  return (
    <div className="space-y-4">
      {secretSantaQuery.data && (
        <SecretSantaAdmin
          eventId={eventId}
          state={secretSantaQuery.data}
          onRefresh={onUpdate}
        />
      )}

      <AdminInviteUser eventId={eventId} />

      <Card className="border border-white/[0.08] bg-white/[0.03] shadow-[0_12px_30px_rgba(0,0,0,0.2)] text-[var(--color-text-primary)] text-[var(--color-text-primary)] border border-[rgba(122,173,58,0.12)] bg-[rgba(15,22,10,0.96)] shadow-[0_16px_32px_rgba(0,0,0,0.14)]">
        <CardHeader className="space-y-1">
          <p className="editorial-kicker">Roster</p>
          <CardTitle>{members.length} {members.length === 1 ? "membro" : "membros"}</CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <AdminStateMessage>Nenhum membro nesta edição.</AdminStateMessage>
          ) : (
            <AdminMembersDataTable 
              data={members} 
              onToggleRole={(member) => roleMutation.mutate(member)} 
              isPendingRoleChange={roleMutation.isPending} 
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
