"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";

export default function CanhoesNotFound() {
  const router = useRouter();

  return (
    <Card className="rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.14)] bg-[linear-gradient(180deg,rgba(18,24,11,0.92),rgba(11,14,8,0.94))] text-[var(--bg-paper)] shadow-[var(--shadow-panel)]">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="space-y-1">
          <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.68)]">
            Nao encontrado
          </p>
          <h1 className="text-xl font-semibold text-[var(--bg-paper)]">Esta area nao existe</h1>
        </div>

        <ErrorAlert
          title="Link indisponivel"
          description="Este link ja nao existe, esta incompleto ou a area deixou de estar disponivel nesta edicao."
        />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => router.push("/canhoes")}>
            Voltar ao evento
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => globalThis.history.back()}
          >
            Voltar atras
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
