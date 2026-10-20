import { notFound } from "next/navigation";

import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto } from "@/lib/api/types";
import CanhoesAdminModule from "@/lib/domains/admin/components/CanhoesAdminModule";
import { isAdminSectionId } from "@/lib/domains/admin/components/adminSections";
import { AdminRouteTabs } from "@/lib/domains/admin/components/layout/AdminRouteTabs";

/** Um separador da área de administração. Só admins chegam aqui: `admin/layout.tsx` reencaminha os outros. */
export default async function AdminSectionPage({ params }: Readonly<{ params: Promise<{ section: string }> }>) {
  const { section } = await params;
  if (!isAdminSectionId(section)) notFound();

  // O contexto do evento ativo é carregado no servidor para o primeiro render já vir preenchido.
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");

  return (
    <div className="zone-admin space-y-2">
      <AdminRouteTabs activeId={section} />
      <CanhoesAdminModule
        section={section}
        initialEventId={activeContext?.event?.id ?? null}
        initialContext={activeContext ?? undefined}
      />
    </div>
  );
}
