"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { AuthProvider } from "@/components/providers/AuthContext";

/** Sem `session`, o cliente vai buscá-la; com uma (vinda do servidor), o primeiro render já aparece autenticado. */
export function AuthProviders({
  session,
  isDevLoginAvailable,
  children,
}: Readonly<{ session?: Session; isDevLoginAvailable: boolean; children: React.ReactNode }>) {
  return (
    <SessionProvider basePath="/api/auth" session={session}>
      <AuthProvider isDevLoginAvailable={isDevLoginAvailable}>{children}</AuthProvider>
    </SessionProvider>
  );
}
