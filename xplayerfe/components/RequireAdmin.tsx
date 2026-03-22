"use client";

import { useAuth } from "@/hooks/useAuth";
import React from "react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };

export default function RequireAdmin({ children, fallback }: Props) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-6">A carregar…</div>;
  if (!user) return <div className="p-6">Sessão não encontrada.</div>;
  if (!user.isAdmin) {
    return fallback ?? <div className="p-6 text-red-600">Sem permissões para aceder a este módulo.</div>;
  }
  return <>{children}</>;
}