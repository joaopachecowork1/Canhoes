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
 * Configuração do NextAuth. O acesso com Google segue a política de entrada em `signInAccess.ts`,
 * email + password é para contas criadas a partir de um convite e, fora de produção, há um
 * admin de desenvolvimento com um clique. As sessões são JWT de 24 horas.
 */

const developmentLoginEnabled = isDevelopmentAuthEnabled();

/**
 * Indica se este IP ou este email fez demasiadas tentativas de login; o contador do email vale mesmo com o IP falsificado.
 * Uma tentativa bloqueada parece uma password errada, por isso não diz nada a quem anda a adivinhar.
 */
function isLoginThrottled(email: string, requestHeaders: Record<string, unknown> = {}) {
  const headers = new Headers(
    Object.entries(requestHeaders).map(([name, value]): [string, string] => [name, String(value)]),
  );
  try {
    // A conta primeiro: uma tentativa que ela recusa não deve gastar também o limite de uma casa que partilha um IP.
    enforceAccountRateLimit(email, "login");
    enforceRateLimit({ headers }, "login");
    return false;
  } catch (error) {
    if (error instanceof HttpError) return true;
    throw error;
  }
}

/** O utilizador com este email quando a password coincide, senão null (não existe, não tem password ou está errada). */
async function findUserWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user?.passwordHash) return null;
  return (await bcrypt.compare(password, user.passwordHash)) ? user : null;
}

/** Como o utilizador entrou, guardado no token. */
type AuthMode = NonNullable<JWT["authMode"]>;

// Do id do fornecedor do NextAuth para o modo guardado no token.
const AUTH_MODES: Record<string, AuthMode> = {
  google: "google",
  development: "development",
  credentials: "credentials",
};

/**
 * No login, regista o fornecedor no token. Os logins por credenciais e de desenvolvimento já trazem
 * o id do utilizador da BD; um login Google é ligado ao seu utilizador (ou cria-o) em `findTokenUser`.
 */
function recordSignIn(token: JWT, account: Account, userId: string | undefined) {
  token.externalId = account.providerAccountId;
  const authMode = AUTH_MODES[account.provider];
  if (!authMode) return;
  token.authMode = authMode;
  token.dbUserId = authMode === "google" ? undefined : (userId ?? token.dbUserId);
}

/** O utilizador da BD do token: pelo id quando já é conhecido, senão encontrado ou criado a partir do email (primeiro login Google). */
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

/** Configuração do NextAuth usada pela rota de auth e pelos `getServerSession`. */
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
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        if (!credentials?.email || !credentials?.password || isLoginThrottled(credentials.email, request?.headers))
          return null;

        const user = await findUserWithPassword(credentials.email, credentials.password);
        return user && { id: user.id, email: user.email, name: user.displayName ?? user.email };
      },
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
  // As falhas de login (um redirect URI do Google errado, um segredo em falta) vão para o mesmo log da API.
  logger: {
    error: (code, metadata) => logger.error(`NextAuth ${code}`, metadata instanceof Error ? metadata : metadata.error),
    warn: (code) => logger.warn(`NextAuth ${code}`),
    debug: (code, metadata) => logger.debug(`NextAuth ${code}`, { metadata }),
  },
  pages: {
    signIn: "/canhoes/login",
    error: "/canhoes/login",
  },
  callbacks: {
    // O Google prova quem alguém é, não que pertence aqui: só entram admins, membros e convidados.
    // Uma recusa vai para a página de login com `?error=AccessDenied`.
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;
      return authorizeGoogleSignIn({
        email: user.email,
        externalId: account.providerAccountId,
        displayName: user.name ?? null,
      });
    },
    // Corre no login e em cada pedido. Liga o token à linha em `Users` (criando-a no primeiro login Google)
    // e relê `isAdmin`, por isso uma mudança de papel aplica-se sem voltar a entrar.
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
