"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        staleTime: 60_000, // 1 minute - reduces backend load
        gcTime: 5 * 60 * 1000, // 5 minutes - keeps data in memory longer
        networkMode: "online",
      },
      mutations: {
        retry: 0, // Don't retry mutations to avoid duplicate writes
      },
    },
  });
}

export default function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  // One client per component instance: a module-level client would be shared by every SSR request.
  const [client] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
