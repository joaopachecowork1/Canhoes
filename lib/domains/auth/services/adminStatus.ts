export type ResolveAdminStatusInput = {
  authLoading: boolean;
  isLogged: boolean;
  userIsAdmin: boolean;
};

export function resolveAdminStatus({
  authLoading,
  isLogged,
  userIsAdmin,
}: Readonly<ResolveAdminStatusInput>) {
  const isAdmin = isLogged && userIsAdmin;

  return {
    isAdmin,
    isLoading: authLoading,
    source: isAdmin ? "profile" : null,
  };
}
