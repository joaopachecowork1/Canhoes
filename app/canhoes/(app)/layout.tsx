import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { CanhoesChrome } from "@/components/chrome/canhoes/CanhoesChrome";
import { AuthProviders } from "@/components/providers/AuthProviders";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { isDevelopmentAuthEnabled } from "@/lib/domains/auth/services/developmentAuth";

/** Layout das páginas autenticadas: valida a sessão no servidor e monta os providers e a moldura da app. */
export default async function CanhoesAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  // O proxy já reencaminha pedidos anónimos; isto cobre um token expirado ou revogado.
  if (!session?.user?.id) redirect("/canhoes/login");

  return (
    <AuthProviders session={session} isDevLoginAvailable={isDevelopmentAuthEnabled()}>
      <CanhoesChrome>{children}</CanhoesChrome>
    </AuthProviders>
  );
}
