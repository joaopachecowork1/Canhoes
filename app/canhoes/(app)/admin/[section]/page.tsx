import { notFound } from "next/navigation";

import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto } from "@/lib/api/types";
import CanhoesAdminModule from "@/lib/domains/admin/components/CanhoesAdminModule";
import { isAdminSectionId } from "@/lib/domains/admin/components/adminSections";
import { AdminRouteTabs } from "@/lib/domains/admin/components/layout/AdminRouteTabs";

/** One tab of the admin area. Only admins get here: `admin/layout.tsx` redirects everyone else. */
export default async function AdminSectionPage({
  params,
}: Readonly<{ params: Promise<{ section: string }> }>) {
  const { section } = await params;
  if (!isAdminSectionId(section)) notFound();

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
