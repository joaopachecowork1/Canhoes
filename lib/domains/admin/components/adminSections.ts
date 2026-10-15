import { BarChart2, FolderTree, Settings2, Users, type LucideIcon } from "lucide-react";

export type AdminSectionId = "dashboard" | "conteudo" | "membros" | "configuracoes";

type AdminSectionCountContext = {
  memberCount: number;
  pendingNominationsCount: number;
  pendingReviewCount: number;
  visibleModuleCount: number;
};

export type AdminSectionItem = {
  count: number;
  description: string;
  icon: LucideIcon;
  id: AdminSectionId;
  label: string;
};

const ADMIN_SECTIONS = [
  {
    id: "dashboard",
    label: "Resumo",
    description: "Leitura rápida da edição, da fila e dos sinais operacionais.",
    icon: BarChart2,
    count: () => 0,
  },
  {
    id: "conteudo",
    label: "Conteúdo",
    description: "Fila, categorias e resultados oficiais.",
    icon: FolderTree,
    count: (context: AdminSectionCountContext) => context.pendingReviewCount + context.pendingNominationsCount,
  },
  {
    id: "membros",
    label: "Membros",
    description: "Amigo secreto e roster operacional desta edição.",
    icon: Users,
    count: (context: AdminSectionCountContext) => context.memberCount,
  },
  {
    id: "configuracoes",
    label: "Evento",
    description: "Evento ativo, fase e visibilidade dos módulos.",
    icon: Settings2,
    count: (context: AdminSectionCountContext) => context.visibleModuleCount,
  },
] as const;

const ADMIN_SECTION_IDS = ADMIN_SECTIONS.map((section) => section.id) as readonly AdminSectionId[];

export function isAdminSectionId(value: string): value is AdminSectionId {
  return ADMIN_SECTION_IDS.includes(value as AdminSectionId);
}

export function getAdminSectionMeta() {
  return ADMIN_SECTIONS.map(({ id, label, icon }) => ({ id, label, icon }));
}

export function getAdminSectionItem(id: AdminSectionId) {
  return ADMIN_SECTIONS.find((section) => section.id === id) ?? null;
}

export function getDefaultAdminSection(): AdminSectionId {
  return "conteudo";
}
