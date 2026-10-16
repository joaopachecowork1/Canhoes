"use client";

import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  isAdmin: boolean;
};

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

function currentCallbackUrl() {
  if (typeof window === "undefined") return "/canhoes";
  const requested = new URLSearchParams(window.location.search).get("callbackUrl");
  return requested?.startsWith("/canhoes") ? requested : "/canhoes";
}

const SKIP_DEV_AUTO_LOGIN_KEY = "skipDevAutoLogin";

// These only call NextAuth, so they are module functions: stable without useCallback.
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

/** Outside production, signs in once with the development provider unless the user logged out. */
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

export function AuthProvider({
  isDevLoginAvailable,
  children,
}: Readonly<{ isDevLoginAvailable: boolean; children: React.ReactNode }>) {
  const { data: session, status, update: updateSession } = useSession();
  const isLoggedIn = status === "authenticated";
  const autoLogin = useDevAutoLogin({ isDevLoginAvailable, status, updateSession });

  const isDevAuthBypass = session?.authMode === "development";

  // The NextAuth `jwt` callback re-reads the user from the database, so the session is the profile.
  const sessionUser = isLoggedIn ? session?.user : undefined;
  const user = useMemo<AuthUser | null>(() => {
    if (!sessionUser) return null;

    return {
      id: sessionUser.id,
      email: sessionUser.email ?? "",
      name: sessionUser.name ?? sessionUser.email?.split("@")[0] ?? "",
      isAdmin: Boolean(sessionUser.isAdmin),
    };
  }, [sessionUser]);

  /** Re-runs the `jwt` callback, which re-reads `isAdmin` and the name from the database. */
  const refreshProfile = useCallback(async () => {
    await updateSession();
  }, [updateSession]);

  const isLoading = status === "loading"
    || autoLogin.isPending
    || (status === "unauthenticated" && isDevLoginAvailable && !autoLogin.hasFailed);

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
    [user, isLoggedIn, isDevAuthBypass, isDevLoginAvailable, isLoading, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function useIsAdmin() {
  const { user } = useAuth();
  return Boolean(user?.isAdmin);
}
