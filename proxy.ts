import { withAuth } from "next-auth/middleware";

// A página de registo abre-se por um link de convite, antes de a conta existir.
const PUBLIC_PATHS = new Set(["/canhoes/login", "/canhoes/register"]);

/** Indica se um pedido sem sessão deve ser reencaminhado para o login (tudo menos as páginas públicas). */
export function shouldRedirectUnauthenticated(pathname: string, token: unknown) {
  return !token && !PUBLIC_PATHS.has(pathname);
}

// Protege `/canhoes/*`: quem não tem sessão vai para o login.
export default withAuth(function proxy() {}, {
  pages: { signIn: "/canhoes/login" },
  callbacks: {
    authorized: ({ req, token }) => !shouldRedirectUnauthenticated(req.nextUrl.pathname, token),
  },
});

export const config = {
  matcher: ["/canhoes/:path*"],
};
