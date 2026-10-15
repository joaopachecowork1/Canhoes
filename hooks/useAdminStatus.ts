"use client";

import { useAuth } from "@/contexts/AuthContext";
import { resolveAdminStatus } from "@/lib/domains/auth/services/adminStatus";

/**
 * Unified admin status hook.
 *
 * The session is the only source of truth: the NextAuth `jwt` callback re-reads `isAdmin` from the database.
 */
export function useAdminStatus() {
  const { isLogged, loading, user } = useAuth();
  return resolveAdminStatus({
    authLoading: loading,
    isLogged,
    userIsAdmin: Boolean(user?.isAdmin),
  });
}
