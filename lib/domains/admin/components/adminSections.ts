import { FolderTree, Settings2, Users, type LucideIcon } from "lucide-react";

import messages from "@/messages/pt.json";

const copy = messages.admin.adminSections;

/** Identificador de cada secção do admin, usado também como segmento do URL. */
export type AdminSectionId = "conteudo" | "membros" | "configuracoes";

/** Secções do admin pela ordem em que aparecem nos separadores. */
export const ADMIN_SECTIONS = [
  { id: "conteudo", label: copy.content, icon: FolderTree },
  { id: "membros", label: copy.members, icon: Users },
  { id: "configuracoes", label: copy.event, icon: Settings2 },
] as const satisfies ReadonlyArray<{ id: AdminSectionId; label: string; icon: LucideIcon }>;

/** Secção aberta quando o URL não indica nenhuma. */
export const DEFAULT_ADMIN_SECTION: AdminSectionId = "conteudo";

/** Indica se um texto (por exemplo, um segmento do URL) é um `AdminSectionId` válido. */
export function isAdminSectionId(value: string): value is AdminSectionId {
  return ADMIN_SECTIONS.some((section) => section.id === value);
}
