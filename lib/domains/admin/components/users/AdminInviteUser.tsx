"use client";

import { useState } from "react";
import { Copy, Check, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getErrorMessage } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";
import messages from "@/messages/pt.json";

const copy = messages.admin.AdminInviteUser;
// tempo até o ícone de "copiado" voltar ao normal
const COPIED_RESET_MS = 3000;

/** Mostra o link de convite gerado, com botão para o copiar. */
function InviteLinkResult({ inviteUrl }: Readonly<{ inviteUrl: string }>) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(inviteUrl);
    setIsCopied(true);
    toast.success(copy.copied);
    setTimeout(() => setIsCopied(false), COPIED_RESET_MS);
  };

  return (
    <div className="mt-4 space-y-2 rounded-md border border-[var(--color-veil)]/14 bg-[var(--color-panel)]/94 p-3">
      <p className="text-xs font-semibold text-[var(--moss-glow)]">{copy.generatedTitle}</p>
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
    </div>
  );
}

/** Formulário para gerar um link de convite para um email; o link aparece por baixo para copiar. */
export function AdminInviteUser({ eventId }: { eventId: string }) {
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const handleInvite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setIsInviting(true);
    setInviteUrl(null);
    try {
      const result = await adminRepo.inviteUser({ email, eventId });
      // a API devolve só o caminho; junta a origem para o link ficar completo
      setInviteUrl(window.location.origin + result.inviteUrl);
      toast.success(copy.generated);
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

        {inviteUrl ? <InviteLinkResult key={inviteUrl} inviteUrl={inviteUrl} /> : null}
      </CardContent>
    </Card>
  );
}
