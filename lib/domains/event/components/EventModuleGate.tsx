"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";

import type { AdminModuleKey } from "@/lib/api/types";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.event.EventModuleGate;

const GATE_CARD_CLASS =
  "rounded-[var(--radius-lg-token)] border border-[var(--color-veil)]/14 bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--color-text-primary)] shadow-[var(--shadow-panel)]";

function GateError({ error, moduleLabel, onRetry }: Readonly<{ error: Error | null; moduleLabel: string; onRetry: () => void }>) {
  return (
    <Card className={GATE_CARD_CLASS}>
      <CardContent className="space-y-4 p-4 sm:p-5">
        <ErrorAlert
          title={formatMessage(copy.errorTitle, { module: moduleLabel })}
          description={error?.message ?? copy.errorDescription}
          actionLabel={messages.common.retry}
          onAction={onRetry}
        />
      </CardContent>
    </Card>
  );
}

function GateLocked({ moduleLabel }: Readonly<{ moduleLabel: string }>) {
  return (
    <Card className={GATE_CARD_CLASS}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Lock className="h-4 w-4 text-[var(--accent-purple-deep)]" />
          {formatMessage(copy.lockedTitle, { module: moduleLabel })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="body-small text-[var(--text-secondary)]">{copy.lockedDescription}</p>
        <p className="text-xs text-[var(--text-muted)]">{copy.lockedHint}</p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/canhoes">{messages.common.backToEvent}</Link>
          </Button>
          <Button variant="outline" onClick={() => globalThis.location.reload()}>
            <RefreshCw className="h-4 w-4" />
            {messages.app.CanhoesError.reload}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Shows a module page only when the user may open it: admins always, members when the phase opens it. */
export function EventModuleGate({
  children,
  moduleKey,
}: Readonly<{
  children: ReactNode;
  moduleKey: AdminModuleKey;
}>) {
  const { error, event, isLoading, overview, refresh } = useEventOverview();
  const moduleLabel = CANHOES_MODULE_BY_KEY[moduleKey].label;

  // Only the first fetch shows a loader; a background refetch keeps the page on screen.
  if (isLoading) {
    return <Skeleton role="status" aria-label={copy.checkingAccess} className="h-56 w-full rounded-[var(--radius-lg-token)]" />;
  }

  if (error || !event || !overview) {
    return <GateError error={error} moduleLabel={moduleLabel} onRetry={() => void refresh()} />;
  }

  if (!overview.permissions.isAdmin && !overview.modules[moduleKey]) {
    return <GateLocked moduleLabel={moduleLabel} />;
  }

  return <>{children}</>;
}
