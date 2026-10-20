"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import messages from "@/messages/pt.json";

const copy = messages.app.CanhoesError;

export default function CanhoesError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    logFrontendError("CanhoesErrorBoundary", error);
  }, [error]);

  return (
    <Card className="border-[var(--color-border)] text-[var(--color-text-primary)]">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{copy.title}</h1>
        </div>

        <ErrorAlert title={copy.alertTitle} description={getErrorMessage(error, copy.alertDescription)} />

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => reset()}>{messages.common.retry}</Button>
          <Button
            variant="outline"
            // A full reload discards the client state that crashed.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            onClick={() => globalThis.location.assign("/canhoes")}
          >
            {messages.common.backToEvent}
          </Button>
          <Button variant="ghost" onClick={() => globalThis.location.reload()}>
            {copy.reload}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
