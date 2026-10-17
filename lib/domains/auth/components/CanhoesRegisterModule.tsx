"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { CheckCircle2 } from "lucide-react";

import { CanhoesBrandMark } from "@/components/chrome/canhoes/CanhoesBrandMark";
import { CanhoesHeroEmblem } from "@/components/chrome/canhoes/CanhoesHeroEmblem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { authRepo } from "@/lib/repositories/authRepo";
import messages from "@/messages/pt.json";

import { AuthErrorPanel } from "./AuthErrorPanel";

const copy = messages.auth.CanhoesRegisterModule;
const MIN_PASSWORD_LENGTH = 8;
const LOGIN_PATH = "/canhoes/login";
const REDIRECT_DELAY_MS = 3000;

type RegisterStatus = "idle" | "submitting" | "done";

function RegisterSuccess({ onGoToLogin }: Readonly<{ onGoToLogin: () => void }>) {
  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center text-[var(--moss)]">
        <CheckCircle2 className="h-12 w-12" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)]">{copy.successTitle}</h2>
      <p className="text-sm text-[var(--text-muted)]">{copy.successRedirecting}</p>
      <Button className="w-full mt-4" onClick={onGoToLogin}>
        {copy.goToLogin}
      </Button>
    </div>
  );
}

function RegisterHeading() {
  return (
    <>
      <div className="flex items-center justify-center">
        <CanhoesHeroEmblem />
      </div>
      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <CanhoesBrandMark compact />
        </div>
        <p className="text-[var(--beige)]">{copy.kicker}</p>
        <p className="body-small text-[var(--beige)]/78">{copy.intro}</p>
      </div>
    </>
  );
}

function GoogleAlternative({ isDisabled }: Readonly<{ isDisabled: boolean }>) {
  return (
    <div className="space-y-2 text-center">
      <p className="text-sm text-[var(--text-muted)]">{copy.googleHint}</p>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isDisabled}
        onClick={() => signIn("google", { callbackUrl: "/canhoes" })}
      >
        {copy.googleLogin}
      </Button>
    </div>
  );
}

function RegisterForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<RegisterStatus>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isSubmitting = status === "submitting";
  const isFormDisabled = isSubmitting || !token;
  const error = submitError ?? (token ? null : copy.missingToken);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !password || !displayName) return;

    setStatus("submitting");
    setSubmitError(null);

    try {
      await authRepo.registerWithInvite({ token, password, displayName });
      setStatus("done");
      setTimeout(() => router.push(LOGIN_PATH), REDIRECT_DELAY_MS);
    } catch (registerError) {
      setSubmitError(getErrorMessage(registerError, copy.genericError, { 400: copy.badRequestError }));
      setStatus("idle");
    }
  };

  if (status === "done") return <RegisterSuccess onGoToLogin={() => router.push(LOGIN_PATH)} />;

  return (
    <div className="space-y-6">
      <RegisterHeading />

      {error ? <AuthErrorPanel title={copy.errorTitle} message={error} /> : null}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">{copy.displayNameLabel}</Label>
          <Input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder={copy.displayNamePlaceholder}
            required
            disabled={isFormDisabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{messages.auth.common.passwordLabel}</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={copy.passwordPlaceholder}
            minLength={MIN_PASSWORD_LENGTH}
            required
            disabled={isFormDisabled}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isFormDisabled || !displayName || password.length < MIN_PASSWORD_LENGTH}>
          {isSubmitting ? copy.submitting : copy.submit}
        </Button>
      </form>

      <GoogleAlternative isDisabled={isSubmitting} />
    </div>
  );
}

export function CanhoesRegisterModule() {
  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,var(--bg-deep)_0%,var(--bg-void)_100%)]">

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-[var(--radius-xl-token)] border p-6 text-[var(--text-primary)] shadow-[var(--shadow-modal)] backdrop-blur-xl sm:p-8">
          <Suspense fallback={<div className="text-center text-white">{messages.common.loading}</div>}>
            <RegisterForm />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
