"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

import { CanhoesBrandMark } from "@/components/chrome/canhoes/CanhoesBrandMark";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/providers/AuthContext";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

import { AuthErrorPanel } from "./AuthErrorPanel";
import { CredentialsLoginForm } from "./CredentialsLoginForm";

const copy = messages.auth.CanhoesLoginModule;
const AUTH_ERROR_MESSAGES: Record<string, string> = copy.authErrors;

function getSafeCallbackUrl(value: string | null): string {
  return value?.startsWith("/canhoes") && !value.startsWith("//") ? value : "/canhoes";
}

function getRequestedCallbackUrl() {
  return getSafeCallbackUrl(new URLSearchParams(window.location.search).get("callbackUrl"));
}

/** Fades the card in, sends signed-in users on, and reads the NextAuth `?error=` code. */
function useLoginPageState() {
  const router = useRouter();
  const { isLogged, loading } = useAuth();
  // A failed email login shows its own message; otherwise NextAuth's `?error=` code, if any.
  const searchParams = useSearchParams();
  const [credentialsError, setAuthError] = useState<string | null>(null);
  const authError = credentialsError ?? searchParams.get("error");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => setIsVisible(true), 100);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!loading && isLogged) router.replace(getRequestedCallbackUrl());
  }, [isLogged, loading, router]);

  return { authError, setAuthError, isVisible };
}

function OrDivider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-[var(--border-subtle)]" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-[var(--bg-surface)] px-2 text-[var(--ink-muted)]">{copy.or}</span>
      </div>
    </div>
  );
}

function DevLoginOption({ onLogin }: Readonly<{ onLogin: () => void }>) {
  return (
    <>
      <div className="rounded-lg border border-dashed border-[var(--person-amber)] px-3 py-2 text-sm text-[var(--person-amber)]">
        {copy.devModeNotice}
      </div>
      <Button variant="outline" className="w-full" onClick={onLogin}>
        {copy.devLogin}
      </Button>
    </>
  );
}

export function CanhoesLoginModule() {
  const router = useRouter();
  const { isLogged, loading, loginGoogle, loginDevelopment, isDevLoginAvailable } = useAuth();
  const { authError, setAuthError, isVisible } = useLoginPageState();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const isGoogleBusy = isSigningIn || (loading && isLogged);

  const handleGoogleLogin = () => {
    setIsSigningIn(true);
    loginGoogle();
  };

  const handleCredentialsLogin = async (email: string, password: string) => {
    setIsSigningIn(true);
    const callbackUrl = getRequestedCallbackUrl();
    const result = await signIn("credentials", { email, password, redirect: false });

    if (result?.error) {
      // The NextAuth code for a wrong email or password, shown like the `?error=` codes.
      setAuthError("CredentialsSignin");
      setIsSigningIn(false);
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="relative isolate min-h-[100svh] bg-[var(--bg-void)]">
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-8">
        <section
          className="w-full max-w-md rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-[var(--text-primary)] shadow-[var(--shadow-card),inset_0_4px_0_var(--moss)] sm:p-8"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 200ms ease, transform 200ms ease",
          }}
        >
          <div className="space-y-6">
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <CanhoesBrandMark compact />
              </div>
              <p className="body-small text-[var(--text-muted)]">{copy.tagline}</p>
            </div>

            <div className="space-y-3">
              {authError ? (
                <AuthErrorPanel
                  title={copy.errorTitle}
                  message={AUTH_ERROR_MESSAGES[authError] ?? AUTH_ERROR_MESSAGES.default}
                  detail={formatMessage(copy.errorCode, { code: authError })}
                />
              ) : null}

              {isDevLoginAvailable ? <DevLoginOption onLogin={loginDevelopment} /> : null}

              <CredentialsLoginForm
                isSigningIn={isSigningIn}
                onSubmit={(email, password) => void handleCredentialsLogin(email, password)}
              />

              <OrDivider />

              <Button
                variant="outline"
                className="w-full text-[var(--text-secondary)]"
                onClick={handleGoogleLogin}
                disabled={isGoogleBusy}
              >
                {isGoogleBusy ? messages.auth.common.signingIn : copy.googleLogin}
              </Button>
              <p className="text-center text-xs text-[var(--text-muted)]">{copy.footer}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
