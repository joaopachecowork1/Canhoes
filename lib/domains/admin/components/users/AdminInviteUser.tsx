"use client";

import { useState } from "react";
import { Copy, Check, Send, Shield, User } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

const copy = messages.admin.AdminInviteUser;
// tempo até o ícone de "copiado" voltar ao normal
const COPIED_RESET_MS = 3000;

type InviteRole = "participant" | "admin";

/** Mostra o link de convite gerado, com botão para o copiar e detalhes do tipo de conta. */
function InviteLinkResult({ inviteUrl, role }: Readonly<{ inviteUrl: string; role: InviteRole }>) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    toast.success(copy.copied);
    setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
  };

  const roleBadgeLabel = copy.roleBadge.replace("{role}", role === "admin" ? copy.adminRole : copy.memberRole);

  return (
    <div className="mt-4 space-y-2 rounded-md border border-[var(--color-veil)]/14 bg-[var(--color-panel)]/94 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[var(--moss-glow)]">{copy.generatedTitle}</p>
        <Badge variant={role === "admin" ? "amber" : "secondary"} className="h-5 px-2 text-[10px]">
          {roleBadgeLabel}
        </Badge>
      </div>
      <p className="text-xs text-[var(--ink-muted)]">{copy.generatedHint}</p>
      <div className="flex items-center gap-2">
        <Input value={inviteUrl} readOnly className="h-8 text-xs bg-black/40 border-[var(--border-paper)]" />
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 shrink-0"
          onClick={handleCopy}
          aria-label={copy.copyLabel}
        >
          {isCopied ? <Check className="h-4 w-4 text-[var(--moss-glow)]" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <p className="text-[11px] text-[var(--color-text-secondary)] italic">{copy.googleOrPasswordNotice}</p>
    </div>
  );
}

/** Seletor do tipo de acesso (Membro ou Administrador). */
function RoleSelector({
  role,
  onSelectRole,
  disabled,
}: {
  role: InviteRole;
  onSelectRole: (role: InviteRole) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-[var(--color-text-secondary)]">{copy.roleLabel}</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={role === "participant" ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onSelectRole("participant")}
          className="flex-1 text-xs"
        >
          <User className="mr-1.5 h-3.5 w-3.5" />
          {copy.memberRole}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={role === "admin" ? "default" : "outline"}
          disabled={disabled}
          onClick={() => onSelectRole("admin")}
          className="flex-1 text-xs"
        >
          <Shield className="mr-1.5 h-3.5 w-3.5" />
          {copy.adminRole}
        </Button>
      </div>
      {role === "admin" ? <p className="text-[11px] text-[var(--person-amber)]">{copy.adminNotice}</p> : null}
    </div>
  );
}

/** Formulário para gerar um link de convite para um email; o link aparece por baixo para copiar. */
export function AdminInviteUser({ eventId }: { eventId: string }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InviteRole>("participant");
  const [isInviting, setIsInviting] = useState(false);
  const [generatedInfo, setGeneratedInfo] = useState<{ inviteUrl: string; role: InviteRole } | null>(null);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setIsInviting(true);
    setGeneratedInfo(null);
    try {
      const result = await adminRepo.inviteUser({ email, eventId, role });
      setGeneratedInfo({
        inviteUrl: window.location.origin + result.inviteUrl,
        role,
      });
      if (result.emailSent) {
        toast.success(copy.sentAndGenerated);
      } else {
        const warningMsg = result.emailReason ? `${copy.generatedOnly}: ${result.emailReason}` : copy.generatedOnly;
        toast.warning(warningMsg);
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.invites(eventId) });
      setEmail("");
    } catch (error) {
      toast.error(getErrorMessage(error, copy.error, { 400: copy.badRequest }));
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <Card className="border-[var(--color-border)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-card)]">
      <CardHeader className="space-y-1">
        <CardTitle>{copy.title}</CardTitle>
        <CardDescription className="text-xs text-[var(--ink-muted)]">{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <RoleSelector role={role} onSelectRole={setRole} disabled={isInviting} />

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="inviteEmail" className="sr-only">
                {messages.auth.CredentialsLoginForm.emailLabel}
              </Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={copy.emailPlaceholder}
                disabled={isInviting}
                className="bg-[var(--color-panel)]/94 border-[var(--color-veil)]/14"
                required
              />
            </div>
            <Button type="submit" disabled={isInviting || !email}>
              <Send className="mr-2 h-4 w-4" />
              {isInviting ? copy.generating : copy.submit}
            </Button>
          </div>
        </form>

        {generatedInfo ? (
          <InviteLinkResult
            key={generatedInfo.inviteUrl}
            inviteUrl={generatedInfo.inviteUrl}
            role={generatedInfo.role}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
