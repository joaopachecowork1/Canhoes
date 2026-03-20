"use client";

import { useEffect, useState } from "react";
import { http } from "./http";

export type Me = { id: string; email: string; displayName?: string; isAdmin: boolean };

type MeApiResponse = {
  user?: {
    id?: unknown;
    email?: unknown;
    displayName?: unknown;
    name?: unknown;
    isAdmin?: unknown;
  };
  id?: unknown;
  email?: unknown;
  displayName?: unknown;
  name?: unknown;
  isAdmin?: unknown;
};

function normalizeMe(data: MeApiResponse): Me {
  const u = data?.user ?? data ?? {};
  return {
    id: String(u.id ?? ""),
    email: String(u.email ?? ""),
    displayName: u.displayName ? String(u.displayName) : String(u.name ?? ""),
    isAdmin: Boolean(u.isAdmin ?? false),
  };
}

export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const cached = typeof window !== "undefined" ? sessionStorage.getItem("me") : null;
        if (cached) {
          const parsed: Me = JSON.parse(cached);
          if (mounted) setMe(parsed);
        }
        // always prefer backend /api/me over NextAuth session for isAdmin
        const res = await http.get<MeApiResponse>("/me", { headers: { "cache-control": "no-cache" } });
        const normalized = normalizeMe(res.data);
        if (mounted) {
          setMe(normalized);
          if (typeof window !== "undefined") sessionStorage.setItem("me", JSON.stringify(normalized));
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { me, loading, error };
}