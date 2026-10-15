"use client";

import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EventModuleUnavailableState({
  description,
  fallbackHref,
  fallbackLabel,
  title,
}: Readonly<{
  description: string;
  fallbackHref: string;
  fallbackLabel: string;
  title: string;
}>) {
  return (
    <Card className="rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--color-text-primary)] shadow-[var(--shadow-panel)]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Lock className="h-4 w-4 text-[var(--accent-purple-deep)]" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="body-small text-[rgba(255,255,255,0.78)]">{description}</p>
        <p className="text-xs text-[var(--text-muted)]">
          Isto pode acontecer se a fase do evento mudou ou se um admin ocultou este módulo.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href={fallbackHref}>Ir para {fallbackLabel}</Link>
          </Button>
          <Button variant="outline" onClick={() => globalThis.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
