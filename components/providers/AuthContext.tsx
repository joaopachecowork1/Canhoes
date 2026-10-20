"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

/** O utilizador autenticado, como a UI o vê. */
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
  /** Chave da paleta com a cor do membro. */
  color?: string;
};

/** O que o contexto de autenticação expõe aos componentes. */
type AuthContextType = {
  user: AuthUser | null;
  isLogged: boolean;
  loading: boolean;
  isDevAuthBypass: boolean;
  isDevLoginAvailable: boolean;
  loginGoogle: () => void;
  loginDevelopment: () => void;
  logout: () => void;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Para onde voltar depois do login: o `callbackUrl` do pedido, só se for dentro de `/canhoes`. */
function currentCallbackUrl() {
  if (typeof window === "undefined") return "/canhoes";
  const requested = new URLSearchParams(window.location.search).get("callbackUrl");
  return requested?.startsWith("/canhoes") ? requested : "/canhoes";
}

// Marca na sessão do browser que o utilizador saiu, para o login de dev não o voltar a autenticar sozinho.
const SKIP_DEV_AUTO_LOGIN_KEY = "skipDevAutoLogin";

// Estas só chamam o NextAuth, por isso são funções de módulo: estáveis sem `useCallback`.
function loginGoogle() {
  void signIn("google", { callbackUrl: currentCallbackUrl() });
}

function loginDevelopment() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(SKIP_DEV_AUTO_LOGIN_KEY);
  }
  void signIn("development", { callbackUrl: currentCallbackUrl() });
}

function logout() {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(SKIP_DEV_AUTO_LOGIN_KEY, "true");
  }
  void signOut({ callbackUrl: "/canhoes/login", redirect: true });
}

/** Fora de produção, entra uma vez com o provider de desenvolvimento, a não ser que o utilizador tenha saído. */
function useDevAutoLogin({
  isDevLoginAvailable,
  status,
  updateSession,
}: Readonly<{ isDevLoginAvailable: boolean; status: string; updateSession: () => Promise<unknown> }>) {
  const autoLoginAttempted = useRef(false);
  const [isPending, setIsPending] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    const shouldSkipAutoLogin =
      typeof window !== "undefined" && sessionStorage.getItem(SKIP_DEV_AUTO_LOGIN_KEY) === "true";

    if (status !== "unauthenticated" || !isDevLoginAvailable || autoLoginAttempted.current || shouldSkipAutoLogin) {
      return;
    }

    // Só uma tentativa por montagem, para um login falhado não entrar em ciclo.
    autoLoginAttempted.current = true;
    setIsPending(true);
    setHasFailed(false);

    void signIn("development", {
      callbackUrl: currentCallbackUrl(),
      redirect: false,
    })
      .then(async (result) => {
        if (!result?.ok) throw new Error(result?.error ?? "Development login failed.");
        await updateSession();
      })
      .catch(() => setHasFailed(true))
      .finally(() => setIsPending(false));
  }, [isDevLoginAvailable, status, updateSession]);

  return { isPending, hasFailed };
}

/** Fornece o utilizador, o estado de carregamento e as ações de login/logout a toda a app. */
export function AuthProvider({
  isDevLoginAvailable,
  children,
}: Readonly<{ isDevLoginAvailable: boolean; children: React.ReactNode }>) {
  const { data: session, status, update: updateSession } = useSession();
  const isLoggedIn = status === "authenticated";
  const autoLogin = useDevAutoLogin({ isDevLoginAvailable, status, updateSession });

  const isDevAuthBypass = session?.authMode === "development";

  // O callback `jwt` do NextAuth relê o utilizador da base de dados, por isso a sessão é o perfil.
  const sessionUser = isLoggedIn ? session?.user : undefined;
  const user = useMemo<AuthUser | null>(() => {
    if (!sessionUser) return null;

    return {
      id: sessionUser.id,
      email: sessionUser.email ?? "",
      name: sessionUser.name ?? sessionUser.email?.split("@")[0] ?? "",
      isAdmin: Boolean(sessionUser.isAdmin),
      color: sessionUser.color,
    };
  }, [sessionUser]);

  /** Volta a correr o callback `jwt`, que relê `isAdmin` e o nome da base de dados. */
  const refreshProfile = useCallback(async () => {
    await updateSession();
  }, [updateSession]);

  // Continua a carregar enquanto o login de dev automático ainda pode acontecer, para não piscar o ecrã de login.
  const isLoading =
    status === "loading" ||
    autoLogin.isPending ||
    (status === "unauthenticated" && isDevLoginAvailable && !autoLogin.hasFailed);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLogged: isLoggedIn,
      loading: isLoading,
      isDevAuthBypass,
      isDevLoginAvailable,
      loginGoogle,
      loginDevelopment,
      logout,
      refreshProfile,
    }),
    [user, isLoggedIn, isDevAuthBypass, isDevLoginAvailable, isLoading, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Lê o contexto de autenticação; só funciona dentro de um `AuthProvider`. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** Diz se o utilizador atual é admin. */
export function useIsAdmin() {
  const { user } = useAuth();
  return Boolean(user?.isAdmin);
}
