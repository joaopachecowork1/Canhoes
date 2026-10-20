"use client";

import { useAuth } from "@/components/providers/AuthContext";
import { resolveAdminStatus } from "@/lib/domains/auth/rules/adminStatus";

/**
 * Estado de admin unificado do utilizador atual.
 *
 * A sessão é a única fonte de verdade: o callback `jwt` do NextAuth relê `isAdmin` da base de dados.
 */
export function useAdminStatus() {
  const { isLogged, loading, user } = useAuth();
  return resolveAdminStatus({
    authLoading: loading,
    isLogged,
    userIsAdmin: Boolean(user?.isAdmin),
  });
}
