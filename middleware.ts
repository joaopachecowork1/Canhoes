import { withAuth } from "next-auth/middleware";
import { isDevelopmentAuthEnabled } from "@/lib/domains/auth/services/developmentAuth";

/** Pages anyone can open without a session: sign-in and accepting an invitation. */
const PUBLIC_PATHS = new Set(["/canhoes/login", "/canhoes/register"]);

export function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname);
}

export function shouldRedirectUnauthenticated(
  token: unknown,
  developmentAuthEnabled = isDevelopmentAuthEnabled()
) {
  return !token && !developmentAuthEnabled;
}

export default withAuth(
  function middleware() {},
  {
    pages: { signIn: "/canhoes/login" },
    callbacks: {
      authorized: ({ req, token }) => {
        if (isPublicPath(req.nextUrl.pathname)) return true;
        return !shouldRedirectUnauthenticated(token);
      },
    },
  }
);

export const config = {
  matcher: ["/canhoes/:path*"],
};
