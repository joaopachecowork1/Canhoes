"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import messages from "@/messages/pt.json";

const copy = messages.app.CanhoesNotFound;

export default function CanhoesNotFound() {
  const router = useRouter();

  return (
    <Card className="rounded-[var(--radius-lg-token)] border border-[var(--color-veil)]/14 bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--bg-paper)] shadow-[var(--shadow-panel)]">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <p className="font-[var(--font-mono)] text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {copy.eyebrow}
          </p>
          <h1 className="text-xl font-semibold text-[var(--bg-paper)]">{copy.title}</h1>
        </div>

        <ErrorAlert
          title={copy.alertTitle}
          description={copy.alertDescription}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => router.push("/canhoes")}>
            {messages.common.backToEvent}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => globalThis.history.back()}
          >
            {copy.goBack}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
