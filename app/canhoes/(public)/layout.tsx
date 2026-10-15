import { AuthProviders } from "@/components/providers/AuthProviders";
import { isDevelopmentAuthEnabled } from "@/lib/domains/auth/services/developmentAuth";

export default function CanhoesPublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // No auth guard, no chrome. Background owned by each child page.
  return (
    <AuthProviders isDevLoginAvailable={isDevelopmentAuthEnabled()}>
      <div data-theme="canhoes" className="min-h-[100svh]">{children}</div>
    </AuthProviders>
  );
}
