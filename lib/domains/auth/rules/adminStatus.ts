/** Estado da sessão de que depende a decisão sobre o administrador. */
export type ResolveAdminStatusInput = {
  authLoading: boolean;
  isLogged: boolean;
  userIsAdmin: boolean;
};

/** Indica se a UI trata o utilizador como administrador (só com sessão iniciada) e se a sessão ainda está a carregar. */
export function resolveAdminStatus({ authLoading, isLogged, userIsAdmin }: Readonly<ResolveAdminStatusInput>) {
  const isAdmin = isLogged && userIsAdmin;

  return {
    isAdmin,
    isLoading: authLoading,
    source: isAdmin ? "profile" : null,
  };
}
