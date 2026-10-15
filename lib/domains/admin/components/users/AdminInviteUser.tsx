"use client";

import { useState } from "react";
import { Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { adminRepo } from "@/lib/repositories/adminRepo";

export function AdminInviteUser({ eventId }: { eventId: string }) {
  const [email, setEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsInviting(true);
    setInviteUrl(null);
    setCopied(false);

    try {
      const { inviteUrl } = await adminRepo.inviteUser({ email, eventId });
      setInviteUrl(window.location.origin + inviteUrl);
      toast.success("Convite gerado com sucesso.");
      setEmail("");
    } catch (error) {
      toast.error(getErrorMessage(error, "Erro ao gerar convite.", { 400: "Não foi possível gerar o convite." }));
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success("Link de convite copiado!");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Card className="border-[rgba(122,173,58,0.12)] bg-[rgba(15,22,10,0.96)] shadow-[0_16px_32px_rgba(0,0,0,0.14)]">
      <CardHeader className="space-y-1">
        <CardTitle>Convidar Utilizador</CardTitle>
        <CardDescription className="text-xs text-[var(--ink-muted)]">
          Gera um link de acesso para um utilizador configurar a sua palavra-passe e aceder ao evento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor="inviteEmail" className="sr-only">Email</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email do utilizador"
                disabled={isInviting}
                className="bg-[rgba(16,23,11,0.94)] border-[rgba(255,255,255,0.14)]"
                required
              />
            </div>
            <Button type="submit" disabled={isInviting || !email}>
              <Send className="mr-2 h-4 w-4" />
              {isInviting ? "A gerar..." : "Gerar Convite"}
            </Button>
          </div>
        </form>

        {inviteUrl && (
          <div className="mt-4 space-y-2 rounded-md border border-[rgba(255,255,255,0.14)] bg-[rgba(16,23,11,0.94)] p-3">
            <p className="text-xs font-semibold text-[var(--moss)]">Convite gerado!</p>
            <p className="text-[10px] text-[var(--ink-muted)]">
              Envia este link para o utilizador. O link expira em 7 dias e só pode ser utilizado uma vez.
            </p>
            <div className="flex items-center gap-2">
              <Input 
                value={inviteUrl} 
                readOnly 
                className="h-8 text-xs bg-black/40 border-[rgba(255,255,255,0.08)]"
              />
              <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={copyToClipboard}>
                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
