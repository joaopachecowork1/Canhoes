export type ResolveAdminStatusInput = {
  authLoading: boolean;
  isLogged: boolean;
  userIsAdmin: boolean;
};

/** The admin flag for the UI (only for a signed-in admin) and whether the session is still loading. */
export function resolveAdminStatus({ authLoading, isLogged, userIsAdmin }: Readonly<ResolveAdminStatusInput>) {
  const isAdmin = isLogged && userIsAdmin;

  return {
    isAdmin,
    isLoading: authLoading,
    source: isAdmin ? "profile" : null,
  };
}
