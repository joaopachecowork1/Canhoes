"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

import dynamic from "next/dynamic";
import { CanhoesBrandMark } from "@/components/chrome/canhoes/CanhoesBrandMark";
import { CanhoesHeroEmblem } from "@/components/chrome/canhoes/CanhoesHeroEmblem";
import { CanhoesDecorativeDivider, CanhoesGlowBackdrop } from "@/components/ui/canhoes-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { signIn } from "next-auth/react";

const LeafRain = dynamic(() => import("@/components/animations/LeafRain"), {
  ssr: false, // Particles don't need SSR
});

const authErrorMessages: Record<string, string> = {
  AccessDenied: "Esta conta ainda não foi convidada. Pede um convite a um admin e entra com o email do convite.",
  Callback: "O regresso da Google falhou. Tenta novamente em alguns segundos.",
  Configuration: "O login Google nao esta configurado corretamente neste deploy.",
  OAuthAccountNotLinked: "Esta conta ja existe com outro metodo de acesso.",
  OAuthCallback: "A Google autenticou, mas o callback do login falhou.",
  OAuthCreateAccount: "Nao foi possivel criar a sessao depois da autenticacao Google.",
  OAuthSignin: "Nao foi possivel iniciar o login Google.",
  SessionRequired: "Esta pagina precisa de uma sessao valida. Faz login novamente.",
  default: "Nao foi possivel concluir o login Google. Tenta novamente.",
};

export default function CanhoesLoginPage() {
  const router = useRouter();
  const {
    isLogged,
    loading,
    loginGoogle,
    loginDevelopment,
    isDevLoginAvailable,
  } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => setIsVisible(true), 100);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!loading && isLogged) {
      const requested = new URLSearchParams(window.location.search).get("callbackUrl");
      router.replace(requested?.startsWith("/canhoes") ? requested : "/canhoes");
    }
  }, [isLogged, loading, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setAuthError(params.get("error"));
  }, []);

  const authErrorMessage = authError
    ? authErrorMessages[authError] ?? authErrorMessages.default
    : null;

  const handleLogin = () => {
    setIsSigningIn(true);
    loginGoogle();
  };

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setIsSigningIn(true);
    const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl") || "/canhoes";
    
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setAuthError("Credenciais inválidas");
      setIsSigningIn(false);
    } else if (result?.ok) {
      router.push(callbackUrl);
    }
  };

  return (
    <div className="relative isolate min-h-[100svh] overflow-hidden bg-[linear-gradient(180deg,var(--bg-deep)_0%,var(--bg-void)_100%)]">
      <CanhoesGlowBackdrop tone="shell" className="opacity-90" />

      <LeafRain />

      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-4 py-10">
        <section
          className="canhoes-bits-panel canhoes-bits-panel--shell editorial-shell w-full max-w-md rounded-[var(--radius-xl-token)] border p-6 text-[var(--text-primary)] shadow-[var(--shadow-modal)] backdrop-blur-xl sm:p-8"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(24px)",
            transition: "opacity 420ms ease, transform 420ms ease",
          }}
        >


          <div className="space-y-6">
            <div className="flex items-center justify-center">
              <CanhoesHeroEmblem />
            </div>

            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <CanhoesBrandMark compact />
              </div>
              <p className="editorial-kicker text-[var(--beige)]">
                Ritual anual
              </p>
              <p className="body-small text-[var(--beige)]/78">
                Um espaco privado para o feed, os premios, as votacoes e o
                arquivo do grupo.
              </p>
            </div>

            <CanhoesDecorativeDivider tone="moss" />

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="canhoes-shell-chip rounded-[var(--radius-md-token)] px-3 py-2">
                <p className="editorial-kicker text-[10px]">Mural</p>
                <p className="text-xs font-medium text-[var(--bg-paper)]">Social</p>
              </div>
              <div className="canhoes-shell-chip rounded-[var(--radius-md-token)] px-3 py-2">
                <p className="editorial-kicker text-[10px]">Boletim</p>
                <p className="text-xs font-medium text-[var(--bg-paper)]">Oficial</p>
              </div>
              <div className="canhoes-shell-chip rounded-[var(--radius-md-token)] px-3 py-2">
                <p className="editorial-kicker text-[10px]">Arquivo</p>
                <p className="text-xs font-medium text-[var(--bg-paper)]">Privado</p>
              </div>
            </div>

            <div className="space-y-3">
              {authErrorMessage ? (
                <div
                  className="canhoes-bits-panel canhoes-bits-panel--danger rounded-lg border px-3 py-3 text-sm text-[rgba(255,228,228,0.94)]"
                  role="alert"
                >
                  <CanhoesGlowBackdrop tone="danger" />
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">Falha no login Google</p>
                      <p className="text-xs text-[rgba(255,228,228,0.84)]">
                        {authErrorMessage}
                      </p>
                      <p className="text-xs text-[rgba(255,228,228,0.68)]">
                        Codigo: {authError}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {isDevLoginAvailable ? (
                <div className="canhoes-bits-panel rounded-lg border border-[rgba(255,209,102,0.32)] bg-[rgba(62,38,12,0.72)] px-3 py-2 text-xs text-[rgba(255,236,188,0.92)]">
                  Modo desenvolvimento ativo. Bypass auth local ligado.
                </div>
              ) : null}

              {isDevLoginAvailable ? (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={loginDevelopment}
                >
                  Entrar em modo desenvolvimento
                </Button>
              ) : null}

              <form onSubmit={handleCredentialsLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teu.email@exemplo.com"
                    required
                    disabled={isSigningIn}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Palavra-passe</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isSigningIn}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSigningIn || !email || !password}
                >
                  {isSigningIn ? "A entrar..." : "Entrar com Email"}
                </Button>
              </form>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--border-subtle)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--bg-paper)] px-2 text-[var(--ink-muted)]">
                    Ou
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full text-white/80"
                onClick={handleLogin}
                disabled={isSigningIn || (loading && isLogged)}
              >
                {isSigningIn || (loading && isLogged)
                  ? "A entrar..."
                  : "Continuar com Google"}
              </Button>
              <p className="text-center text-xs text-[var(--beige)]/72">
                Acesso reservado aos membros do evento. O login Google continua ativo.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
