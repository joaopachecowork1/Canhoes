import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() }
        });
        
        if (!user || !user.passwordHash) {
          return null; // User not found or has no password set
        }
        
        const isPasswordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        
        if (!isPasswordValid) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.email,
        };
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
      if (account?.providerAccountId) {
        token.externalId = account.providerAccountId;
      }

      if (user?.id && account?.provider === "development") {
        token.dbUserId = user.id;
      }
      
      if (user?.id && account?.provider === "credentials") {
        token.dbUserId = user.id;
      }

      if (account?.provider === "google") {
        token.dbUserId = undefined;
      }

      if (account?.provider === "development") token.authMode = "development";
      if (account?.provider === "google") token.authMode = "google";
      if (account?.provider === "credentials") token.authMode = "credentials";

      let dbUser: ResolvedUser | null = isDatabaseUserId(token.dbUserId)
        ? await prisma.user.findUnique({
            where: { id: token.dbUserId },
            select: { id: true, email: true, displayName: true, isAdmin: true },
          })
        : null;

      if (!dbUser && token.email) {
        const externalId = String(token.externalId ?? token.sub ?? token.email);
        dbUser = await resolveUser(externalId, token.email, token.name ?? null);
        token.dbUserId = dbUser.id;
      }

      token.isAdmin = Boolean(dbUser?.isAdmin);
      if (dbUser) {
        token.sub = dbUser.id;
        token.email = dbUser.email;
        token.name = dbUser.displayName ?? token.name;
      }

      return token;
    },
    async session({ session, token }) {
      session.user.isAdmin = Boolean(token.isAdmin);
      session.user.id = String(token.dbUserId ?? token.sub ?? "");
      
      if (token.authMode === "development") session.authMode = "development";
      else if (token.authMode === "credentials") session.authMode = "credentials";
      else session.authMode = "google";

      return session;
    },
  },
};
