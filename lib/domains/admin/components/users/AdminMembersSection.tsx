"use client";

import type { PublicUserDto } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logFrontendError } from "@/lib/errors";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { useAdminMembers } from "../../hooks/useAdminMembers";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { AdminInviteUser } from "./AdminInviteUser";
import { AdminMembersList } from "./AdminMembersList";
import { SecretSantaAdmin } from "./SecretSantaAdmin";

const copy = messages.admin.AdminMembersSection;
const CARD_CLASS = "border-[rgba(122,173,58,0.12)] bg-[rgba(15,22,10,0.96)] shadow-[0_16px_32px_rgba(0,0,0,0.14)]";

type AdminMembersSectionProps = {
  eventId: string | null;
  loading: boolean;
  onUpdate: () => Promise<void>;
};

function MembersRoster({
  isPendingRoleChange,
  members,
  onToggleRole,
}: Readonly<{ isPendingRoleChange: boolean; members: PublicUserDto[]; onToggleRole: (member: { id: string; isAdmin: boolean }) => void }>) {
  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="space-y-1">
        <p>{copy.kicker}</p>
        <CardTitle>{formatCount(members.length, copy.member, copy.members)}</CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <AdminStateMessage>{copy.empty}</AdminStateMessage>
        ) : (
          <AdminMembersList members={members} onToggleRole={onToggleRole} isPendingRoleChange={isPendingRoleChange} />
        )}
      </CardContent>
    </Card>
  );
}

export function AdminMembersSection({ eventId, loading, onUpdate }: Readonly<AdminMembersSectionProps>) {
  const admin = useAdminMembers(eventId);

  if (!eventId) return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;
  if (loading || admin.isLoading) return <AdminStateMessage>{copy.loading}</AdminStateMessage>;

  if (admin.queryError) {
    logFrontendError("AdminMembersSection.query", admin.queryError, { eventId });
    return (
      <AdminStateMessage tone="error" action={<Button onClick={() => void admin.refetchAll()}>{messages.common.retry}</Button>}>
        {copy.loadError}
      </AdminStateMessage>
    );
  }

  return (
    <div className="space-y-4">
      {admin.secretSantaState ? <SecretSantaAdmin eventId={eventId} state={admin.secretSantaState} onRefresh={onUpdate} /> : null}
      <AdminInviteUser eventId={eventId} />
      <MembersRoster
        members={admin.members}
        onToggleRole={(member) => admin.roleMutation.mutate(member)}
        isPendingRoleChange={admin.roleMutation.isPending}
      />
    </div>
  );
}
