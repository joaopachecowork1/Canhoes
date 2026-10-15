"use client";

import type { ReactNode } from "react";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";

import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminStatus } from "@/hooks/useAdminStatus";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "./adminContentUi";

function AdminStateCard({ action, description, title }: Readonly<{ action?: ReactNode; description: string; title: string }>) {
  return (
    <section className="border border-white/[0.08] bg-white/[0.03] shadow-[0_12px_30px_rgba(0,0,0,0.2)] text-[var(--color-text-primary)] text-[var(--color-text-primary)] mx-auto max-w-xl px-5 py-10 text-center sm:px-6">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(122,173,58,0.24)] bg-[rgba(122,173,58,0.12)] text-[var(--neon-green)] shadow-[var(--glow-green-sm)]">
        <Shield className="h-7 w-7" />
      </div>
      <div className="mt-5 space-y-2">
        <h2 className="heading-2 text-[var(--ink-primary)]">{title}</h2>
        <p className="body-small text-[var(--ink-muted)]">{description}</p>
      </div>
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

export function AdminGate({ children }: Readonly<{ children: ReactNode }>) {
  const { loading, isLogged, user, loginGoogle } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useAdminStatus();
  const router = useRouter();

  if (loading || (isLogged && !user) || adminLoading) {
    return (
      <AdminStateCard
        title="A preparar o admin"
        description="A verificar a sessao e as permissoes administrativas deste evento."
        action={
          <div className="mx-auto h-9 w-9 rounded-full border-4 border-[var(--color-moss)] border-t-transparent animate-spin" />
        }
      />
    );
  }

  if (!isLogged) {
    return (
      <AdminStateCard
        title="Sessao necessaria"
        description="Entra com a tua conta para abrir o centro de controlo do evento."
        action={
          <Button className="w-full sm:w-auto" onClick={loginGoogle}>
            Entrar com Google
          </Button>
        }
      />
    );
  }

  if (!isAdmin) {
    return (
      <AdminStateCard
        title="Acesso restrito"
        description="Esta area continua visivel, mas so os admins confirmados conseguem moderar propostas, votos e fases do evento."
        action={
          <Button
            variant="outline"
            className={ADMIN_OUTLINE_BUTTON_CLASS}
            onClick={() => router.push("/canhoes")}
          >
            Voltar ao feed
          </Button>
        }
      />
    );
  }

  return <EventModuleGate moduleKey="admin">{children}</EventModuleGate>;
}
