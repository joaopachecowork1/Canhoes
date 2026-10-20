import NextAuth from "next-auth";

import { authOptions } from "@/lib/domains/auth/services/auth";

// Atrás de um proxy ou túnel, define AUTH_TRUST_HOST=true para o NextAuth construir os URLs a partir do host reencaminhado.
const handler = NextAuth(authOptions);

/** GET e POST /api/auth/*: todas as rotas do NextAuth (login, callbacks, sessão). */
export { handler as GET, handler as POST };
