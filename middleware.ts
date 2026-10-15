import { withAuth } from "next-auth/middleware";

// The register page is reached through an invite link, before the account exists.
const PUBLIC_PATHS = new Set(["/canhoes/login", "/canhoes/register"]);

/** In development, the login page signs in automatically and returns to `callbackUrl`. */
export function shouldRedirectUnauthenticated(pathname: string, token: unknown) {
  return !token && !PUBLIC_PATHS.has(pathname);
}

export default withAuth(
  function middleware() {},
  {
    pages: { signIn: "/canhoes/login" },
    callbacks: {
      authorized: ({ req, token }) => !shouldRedirectUnauthenticated(req.nextUrl.pathname, token),
    },
  }
);

export const config = {
  matcher: ["/canhoes/:path*"],
};
