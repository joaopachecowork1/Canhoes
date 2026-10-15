"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

import { AuthProvider } from "@/contexts/AuthContext";

/** Without `session`, the client fetches it; with one (from the server), the first render is already signed in. */
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
