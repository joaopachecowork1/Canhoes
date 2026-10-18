import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";

import { AuthProvider } from "@/components/providers/AuthContext";
import { Toaster } from "@/components/ui/sonner";

/**
 * Renders like the app does: a fresh QueryClient per test (no cache shared between tests), the
 * real AuthProvider over the mocked session, and the toaster, so tests can read toast messages.
 */
export function renderWithProviders(ui: ReactElement): RenderResult & { queryClient: QueryClient } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchInterval: false }, mutations: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider isDevLoginAvailable={false}>
          {ui}
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    ),
  };
}
