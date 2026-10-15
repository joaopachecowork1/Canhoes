import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { CanhoesChrome } from "@/components/chrome/canhoes/CanhoesChrome";
import { AuthProviders } from "@/components/providers/AuthProviders";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { isDevelopmentAuthEnabled } from "@/lib/domains/auth/services/developmentAuth";

export default async function CanhoesAppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  // The proxy already redirects anonymous requests; this covers an expired or revoked token.
  if (!session?.user?.id) redirect("/canhoes/login");

  return (
    <AuthProviders session={session} isDevLoginAvailable={isDevelopmentAuthEnabled()}>
      <CanhoesChrome>{children}</CanhoesChrome>
    </AuthProviders>
  );
}
