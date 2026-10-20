"use client";

import React from "react";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/** Cria o cliente do TanStack Query com os valores por defeito de cache e de repetição. */
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
        staleTime: 60_000, // 1 minuto: poupa pedidos ao servidor
        gcTime: 5 * 60 * 1000, // 5 minutos: mantém os dados em memória mais tempo
        networkMode: "online",
      },
      mutations: {
        retry: 0, // Não repete escritas, para não as duplicar
      },
    },
  });
}

/** Providers globais do cliente: TanStack Query e os avisos (toasts). */
export default function AppProviders({ children }: Readonly<{ children: React.ReactNode }>) {
  // Um cliente por instância do componente: um cliente ao nível do módulo seria partilhado por todos os pedidos SSR.
  const [client] = React.useState(createQueryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}
