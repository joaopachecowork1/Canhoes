import { canhoesFetch } from "@/lib/api/canhoesClient";

/** Chamadas de registo por convite e de escolha da cor do utilizador. */
export const authRepo = {
  registerWithInvite: (payload: { token: string; password: string; displayName: string }) =>
    canhoesFetch<{ email: string; displayName: string | null }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
      canhoes: { throwOnUnauthorized: true },
    }),

  setMyColor: (color: string) =>
    canhoesFetch<{ color: string }>("/v1/me/color", {
      method: "PUT",
      body: JSON.stringify({ color }),
    }),
};
