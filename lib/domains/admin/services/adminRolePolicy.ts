import { HttpError } from "@/lib/api/httpError";

export type AdminRoleChange = {
  actorUserId: string;
  targetUserId: string;
  targetIsAdmin: boolean;
  nextIsAdmin: boolean;
  adminCount: number;
  confirmSelfDemotion: boolean;
};

export type AdminRoleChangeErrorCode =
  "MEMBER_NOT_FOUND" | "SELF_DEMOTION_CONFIRMATION_REQUIRED" | "LAST_ADMIN_REQUIRED";

const ROLE_CHANGE_ERROR_MESSAGES: Record<AdminRoleChangeErrorCode, string> = {
  MEMBER_NOT_FOUND: "Este membro não pertence ao evento.",
  SELF_DEMOTION_CONFIRMATION_REQUIRED: "Confirma que queres retirar o teu próprio acesso de admin.",
  LAST_ADMIN_REQUIRED: "Tem de existir pelo menos um admin.",
};

export class AdminRoleChangeError extends HttpError {
  constructor(override readonly code: AdminRoleChangeErrorCode) {
    super(code === "MEMBER_NOT_FOUND" ? 404 : 409, code, ROLE_CHANGE_ERROR_MESSAGES[code]);
    this.name = "AdminRoleChangeError";
  }
}

/** Throws `AdminRoleChangeError` when a demotion would leave no admin or is a self-demotion the actor did not confirm. */
export function assertAdminRoleChangeAllowed(change: AdminRoleChange) {
  const isDemotion = change.targetIsAdmin && !change.nextIsAdmin;
  if (!isDemotion) return;

  if (change.actorUserId === change.targetUserId && !change.confirmSelfDemotion) {
    throw new AdminRoleChangeError("SELF_DEMOTION_CONFIRMATION_REQUIRED");
  }

  if (change.adminCount <= 1) {
    throw new AdminRoleChangeError("LAST_ADMIN_REQUIRED");
  }
}
