import { requireAdmin } from "@/lib/api/guards";
import { apiRoute, json } from "@/lib/api/route";
import { resendInvitation, revokeInvitation } from "@/lib/domains/auth/services/invitations";

type InviteParams = { inviteId: string };

/** POST /admin/invites/:inviteId: reenvia o email de convite e renova a validade */
export const POST = apiRoute<InviteParams>(async (_request, { inviteId }) => {
  await requireAdmin();
  return json(await resendInvitation(inviteId));
});

/** DELETE /admin/invites/:inviteId: revoga e elimina um convite */
export const DELETE = apiRoute<InviteParams>(async (_request, { inviteId }) => {
  await requireAdmin();
  return json(await revokeInvitation(inviteId));
});
