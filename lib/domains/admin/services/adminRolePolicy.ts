import { HttpError } from "@/lib/api/httpError";

/** Os dados necessários para decidir se uma mudança de papel de admin é permitida. */
export type AdminRoleChange = {
  actorUserId: string;
  targetUserId: string;
  targetIsAdmin: boolean;
  nextIsAdmin: boolean;
  adminCount: number;
  confirmSelfDemotion: boolean;
};

/** Códigos de erro de uma mudança de papel recusada. */
export type AdminRoleChangeErrorCode =
  "MEMBER_NOT_FOUND" | "SELF_DEMOTION_CONFIRMATION_REQUIRED" | "LAST_ADMIN_REQUIRED";

// Mensagem de cada erro, em português.
const ROLE_CHANGE_ERROR_MESSAGES: Record<AdminRoleChangeErrorCode, string> = {
  MEMBER_NOT_FOUND: "Este membro não pertence ao evento.",
  SELF_DEMOTION_CONFIRMATION_REQUIRED: "Confirma que queres retirar o teu próprio acesso de admin.",
  LAST_ADMIN_REQUIRED: "Tem de existir pelo menos um admin.",
};

/** Erro de mudança de papel: 404 se o membro não existe, 409 nos restantes casos. */
export class AdminRoleChangeError extends HttpError {
  constructor(override readonly code: AdminRoleChangeErrorCode) {
    super(code === "MEMBER_NOT_FOUND" ? 404 : 409, code, ROLE_CHANGE_ERROR_MESSAGES[code]);
    this.name = "AdminRoleChangeError";
  }
}

/** Lança `AdminRoleChangeError` quando uma despromoção deixaria o portal sem admin ou é uma auto-despromoção que o autor não confirmou. */
export function assertAdminRoleChangeAllowed(change: AdminRoleChange) {
  // Promover nunca é problema; só a despromoção tem regras.
  const isDemotion = change.targetIsAdmin && !change.nextIsAdmin;
  if (!isDemotion) return;

  // Quem se retira a si próprio tem de o confirmar.
  if (change.actorUserId === change.targetUserId && !change.confirmSelfDemotion) {
    throw new AdminRoleChangeError("SELF_DEMOTION_CONFIRMATION_REQUIRED");
  }

  // Tem de sobrar pelo menos um admin.
  if (change.adminCount <= 1) {
    throw new AdminRoleChangeError("LAST_ADMIN_REQUIRED");
  }
}
