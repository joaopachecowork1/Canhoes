"use client";

import type { AdminModuleKey } from "@/lib/api/types";
import { useEventOverview } from "@/hooks/useEventOverview";
import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";

/** Whether the user may open a module page: admins always, members when the phase opens it. */
export function useEventModuleAccess(moduleKey: AdminModuleKey) {
  const eventOverview = useEventOverview();
  const isAdmin = Boolean(eventOverview.overview?.permissions.isAdmin);
  const isOpen = Boolean(eventOverview.overview?.modules[moduleKey]);

  return {
    ...eventOverview,
    module: { key: moduleKey, label: CANHOES_MODULE_BY_KEY[moduleKey].label },
    fallbackHref: "/canhoes",
    fallbackLabel: "Voltar",
    isAllowed: isAdmin || isOpen,
  };
}
