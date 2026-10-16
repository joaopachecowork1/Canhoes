import { FolderTree, Settings2, Users, type LucideIcon } from "lucide-react";

import messages from "@/messages/pt.json";

const copy = messages.admin.adminSections;

export type AdminSectionId = "conteudo" | "membros" | "configuracoes";

export const ADMIN_SECTIONS = [
  { id: "conteudo", label: copy.content, icon: FolderTree },
  { id: "membros", label: copy.members, icon: Users },
  { id: "configuracoes", label: copy.event, icon: Settings2 },
] as const satisfies ReadonlyArray<{ id: AdminSectionId; label: string; icon: LucideIcon }>;

export const DEFAULT_ADMIN_SECTION: AdminSectionId = "conteudo";

export function isAdminSectionId(value: string): value is AdminSectionId {
  return ADMIN_SECTIONS.some((section) => section.id === value);
}
