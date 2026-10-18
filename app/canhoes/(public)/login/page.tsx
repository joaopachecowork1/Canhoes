import { Suspense } from "react";

import { CanhoesLoginModule } from "@/lib/domains/auth/components/CanhoesLoginModule";

export default function CanhoesLoginPage() {
  // The login reads `?error=` and `?callbackUrl=`, which needs a Suspense boundary to prerender.
  return (
    <Suspense>
      <CanhoesLoginModule />
    </Suspense>
  );
}
