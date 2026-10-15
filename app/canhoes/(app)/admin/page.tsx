import { redirect } from "next/navigation";

import { DEFAULT_ADMIN_SECTION } from "@/lib/domains/admin/components/adminSections";

export default function AdminPage() {
  redirect(`/canhoes/admin/${DEFAULT_ADMIN_SECTION}`);
}
