import { AuthProviders } from "@/components/providers/AuthProviders";
import { isDevelopmentAuthEnabled } from "@/lib/domains/auth/services/developmentAuth";

/** Layout das páginas públicas (login e registo): providers de sessão, sem moldura nem guarda. */
export default function CanhoesPublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Sem guarda de sessão nem moldura; o fundo é de cada página.
  return (
    <AuthProviders isDevLoginAvailable={isDevelopmentAuthEnabled()}>
      <div data-theme="canhoes" className="min-h-[100svh]">
        {children}
      </div>
    </AuthProviders>
  );
}
