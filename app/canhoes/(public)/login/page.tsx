import { Suspense } from "react";

import { CanhoesLoginModule } from "@/lib/domains/auth/components/CanhoesLoginModule";

/** Página de login. */
export default function CanhoesLoginPage() {
  // O login lê `?error=` e `?callbackUrl=`, o que exige uma fronteira Suspense para poder ser pré-renderizado.
  return (
    <Suspense>
      <CanhoesLoginModule />
    </Suspense>
  );
}
