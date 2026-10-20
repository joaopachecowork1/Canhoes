import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/domains/auth/services/serverAuth";

/** Guarda da área de administração: só admins autenticados passam, os outros são reencaminhados. */
export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getRequestUser();
  // Sem sessão vai para o login; com sessão mas sem `isAdmin` vai para a página de acesso negado.
  if (!user) redirect("/canhoes/login");
  if (!user.isAdmin) redirect("/canhoes/forbidden");

  return children;
}
