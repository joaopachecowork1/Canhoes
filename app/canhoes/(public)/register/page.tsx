"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { CanhoesBrandMark } from "@/components/chrome/canhoes/CanhoesBrandMark";
import { CanhoesHeroEmblem } from "@/components/chrome/canhoes/CanhoesHeroEmblem";
import { CanhoesDecorativeDivider, CanhoesGlowBackdrop } from "@/components/ui/canhoes-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getErrorMessage } from "@/lib/errors";
import { authRepo } from "@/lib/repositories/authRepo";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token de convite não encontrado no link.");
    }
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !password || !displayName) return;
    
    setIsRegistering(true);
    setError(null);

    try {
      await authRepo.registerWithInvite({ token, password, displayName });
      setSuccess(true);
      setTimeout(() => {
        router.push("/canhoes/login");
      }, 3000);
    } catch (error) {
      setError(getErrorMessage(error, "Erro ao criar conta.", { 400: "Não foi possível criar a conta." }));
      setIsRegistering(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center text-[var(--moss)]">
          <CheckCircle2 className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-[var(--text-primary)]">Conta criada com sucesso!</h2>
        <p className="text-sm text-[var(--text-muted)]">
          A redirecionar para a página de login...
        </p>
        <Button className="w-full mt-4" onClick={() => router.push("/canhoes/login")}>
          Ir para Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center">
        <CanhoesHeroEmblem />
      </div>

      <div className="space-y-3 text-center">
        <div className="flex justify-center">
          <CanhoesBrandMark compact />
        </div>
        <p className="editorial-kicker text-[var(--beige)]">
          Criar Conta
        </p>
        <p className="body-small text-[var(--beige)]/78">
          Foste convidado para o evento. Preenche os teus dados para aceder.
        </p>
      </div>

      <CanhoesDecorativeDivider tone="moss" />

      {error ? (
        <div
          className="canhoes-bits-panel canhoes-bits-panel--danger rounded-lg border px-3 py-3 text-sm text-[rgba(255,228,228,0.94)]"
          role="alert"
        >
          <CanhoesGlowBackdrop tone="danger" />
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">Erro no registo</p>
              <p className="text-xs text-[rgba(255,228,228,0.84)]">
                {error}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome visível (Alcunha)</Label>
          <Input 
            id="displayName" 
            type="text" 
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="O teu nome ou alcunha"
            required
            disabled={isRegistering || !token}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input 
            id="password" 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            minLength={8}
            required
            disabled={isRegistering || !token}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={isRegistering || !token || !displayName || password.length < 8}
        >
          {isRegistering ? "A criar conta..." : "Criar Conta"}
        </Button>
      </form>

      <div className="space-y-2 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Preferes usar a conta Google? Entra com o email para onde recebeste o convite.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isRegistering}
          onClick={() => signIn("google", { callbackUrl: "/canhoes" })}
        >
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}

export default function CanhoesRegisterPage() {
  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,var(--bg-deep)_0%,var(--bg-void)_100%)]">
      <CanhoesGlowBackdrop tone="shell" className="opacity-90" />

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-10">
        <section
          className="canhoes-bits-panel canhoes-bits-panel--shell editorial-shell w-full max-w-md rounded-[var(--radius-xl-token)] border p-6 text-[var(--text-primary)] shadow-[var(--shadow-modal)] backdrop-blur-xl sm:p-8"
        >
          <Suspense fallback={<div className="text-center text-white">A carregar...</div>}>
            <RegisterForm />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
