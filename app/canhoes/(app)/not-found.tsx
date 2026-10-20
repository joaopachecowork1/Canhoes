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
    <Card className="border-[var(--color-border)] text-[var(--color-text-primary)]">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">{copy.title}</h1>
        </div>

        <ErrorAlert title={copy.alertTitle} description={copy.alertDescription} />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => router.push("/canhoes")}>
            {messages.common.backToEvent}
          </Button>
          <Button type="button" variant="outline" onClick={() => globalThis.history.back()}>
            {copy.goBack}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
