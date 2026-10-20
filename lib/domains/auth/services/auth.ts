import type { Account, NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { HttpError } from "@/lib/api/httpError";
import { enforceAccountRateLimit, enforceRateLimit } from "@/lib/api/rateLimit";
import { isDevelopmentAuthEnabled } from "@/lib/domains/auth/services/developmentAuth";
import { isDatabaseUserId } from "@/lib/domains/auth/services/userIdentity";
import { resolveDevelopmentAdmin, resolveUser, type ResolvedUser } from "./authService";
import { authorizeGoogleSignIn } from "./signInAccess";

/*
 * NextAuth configuration. Google access follows the onboarding policy in `signInAccess.ts`,
 * email + password is for accounts created from an invitation, and outside production there is
 * a one-click development admin. Sessions are 24-hour JWTs.
 */

const developmentLoginEnabled = isDevelopmentAuthEnabled();

/**
 * Whether this IP or this email made too many login attempts; the email counter holds even when the IP is faked.
 * A throttled attempt looks like a wrong password, so it tells a guesser nothing.
 */
function isLoginThrottled(email: string, requestHeaders: Record<string, unknown> = {}) {
  const headers = new Headers(Object.entries(requestHeaders).map(([name, value]): [string, string] => [name, String(value)]));
  try {
    // The account first: an attempt it refuses must not also use up the budget of a house that shares one IP.
    enforceAccountRateLimit(email, "login");
    enforceRateLimit({ headers }, "login");
    return false;
  } catch (error) {
    if (error instanceof HttpError) return true;
    throw error;
  }
}

/** The user with this email when the password matches, otherwise null (no such user, no password set, or a wrong one). */
async function findUserWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

type AuthMode = NonNullable<JWT["authMode"]>;

const AUTH_MODES: Record<string, AuthMode> = { google: "google", development: "development", credentials: "credentials" };

/**
 * On sign-in, notes the provider on the token. Credentials and development logins already carry
 * the database user's id; a Google login is matched to (or creates) its user in `findTokenUser`.
 */
function recordSignIn(token: JWT, account: Account, userId: string | undefined) {
  token.externalId = account.providerAccountId;
  const authMode = AUTH_MODES[account.provider];
  if (!authMode) return;
  token.authMode = authMode;
  token.dbUserId = authMode === "google" ? undefined : (userId ?? token.dbUserId);
}

/** The token's database user: by id once known, else found or created from the email (first Google sign-in). */
async function findTokenUser(token: JWT): Promise<ResolvedUser | null> {
  if (isDatabaseUserId(token.dbUserId)) {
    const user = await prisma.user.findUnique({
      where: { id: token.dbUserId },
      select: { id: true, email: true, displayName: true, isAdmin: true, color: true },
    });
    if (user) return user;
  }
  if (!token.email) return null;
  return resolveUser(String(token.externalId ?? token.sub ?? token.email), token.email, token.name ?? null);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password || isLoginThrottled(credentials.email, request?.headers)) return null;

        const user = await findUserWithPassword(credentials.email, credentials.password);
        return user && { id: user.id, email: user.email, name: user.displayName ?? user.email };
      }
    }),
    ...(developmentLoginEnabled
      ? [
          CredentialsProvider({
            id: "development",
            name: "Development login",
            credentials: {},
            async authorize() {
              const email = (process.env.DEV_AUTH_EMAIL ?? "dev@example.com").trim().toLowerCase();
              const externalId = (process.env.DEV_AUTH_USER_ID ?? `dev:${email}`).trim();
              const displayName = (process.env.DEV_AUTH_NAME ?? "Dev User").trim();
              const user = await resolveDevelopmentAdmin(externalId, email, displayName);
              return {
                id: user.id,
                email: user.email,
                name: user.displayName ?? user.email,
              };
            },
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  secret: process.env.NEXTAUTH_SECRET,
  // Sign-in failures (a wrong Google redirect URI, a missing secret) go to the same log as the API.
  logger: {
    error: (code, metadata) =>
      logger.error(`NextAuth ${code}`, metadata instanceof Error ? metadata : metadata.error),
    warn: (code) => logger.warn(`NextAuth ${code}`),
    debug: (code, metadata) => logger.debug(`NextAuth ${code}`, { metadata }),
  },
  pages: {
    signIn: "/canhoes/login",
    error: "/canhoes/login",
  },
  callbacks: {
    // Google proves who someone is, not that they belong here: only admins, members and invited
    // people get in. A refusal lands on the login page with `?error=AccessDenied`.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;
      return authorizeGoogleSignIn({
        email: user.email,
        externalId: account.providerAccountId,
        displayName: user.name ?? null,
      });
    },
    // Runs on sign-in and on every request. It ties the token to the row in `Users` (creating it for a
    // first Google sign-in) and re-reads `isAdmin`, so a role change applies without signing in again.
    async jwt({ token, user, account }) {
      if (account) recordSignIn(token, account, user?.id);

      const dbUser = await findTokenUser(token);
      token.isAdmin = Boolean(dbUser?.isAdmin);
      token.color = dbUser?.color;
      if (dbUser) {
        token.dbUserId = dbUser.id;
        token.sub = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.displayName ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.color = token.color;
      session.user.id = String(token.dbUserId ?? token.sub ?? "");
      session.authMode = token.authMode ?? "google";
      return session;
    },
  },
};
