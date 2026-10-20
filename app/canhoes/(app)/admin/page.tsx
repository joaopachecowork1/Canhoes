import { redirect } from "next/navigation";

import { DEFAULT_ADMIN_SECTION } from "@/lib/domains/admin/components/adminSections";

/** Entrada da área de administração: abre a secção por defeito. */
export default function AdminPage() {
  redirect(`/canhoes/admin/${DEFAULT_ADMIN_SECTION}`);
}
