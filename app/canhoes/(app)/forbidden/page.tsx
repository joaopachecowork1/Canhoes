import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import messages from "@/messages/pt.json";

const copy = messages.app.ForbiddenPage;

/** Página de acesso negado para quem não tem permissões de admin. */
export default function ForbiddenPage() {
  return (
    <div className="mx-auto flex min-h-[70svh] max-w-lg items-center px-4">
      <Card className="w-full text-center">
        <CardHeader>
          <ShieldX className="mx-auto h-10 w-10 text-[var(--moss)]" />
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{copy.description}</p>
          <Button asChild>
            <Link href="/canhoes">{copy.back}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
