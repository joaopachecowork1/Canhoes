"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import messages from "@/messages/pt.json";

const copy = messages.auth.CredentialsLoginForm;

/** Formulário de email e palavra-passe para contas criadas por convite. */
export function CredentialsLoginForm({
  isSigningIn,
  onSubmit,
}: Readonly<{ isSigningIn: boolean; onSubmit: (email: string, password: string) => void }>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email || !password) return;
    onSubmit(email, password);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{copy.emailLabel}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={copy.emailPlaceholder}
          required
          disabled={isSigningIn}
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
          required
          disabled={isSigningIn}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSigningIn || !email || !password}>
        {isSigningIn ? messages.auth.common.signingIn : copy.submit}
      </Button>
    </form>
  );
}
