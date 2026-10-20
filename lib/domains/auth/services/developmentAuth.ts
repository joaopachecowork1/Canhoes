/** Verdadeiro fora de produção com `DEV_AUTH_BYPASS_ENABLED=true`: ativa o login de admin de desenvolvimento com um clique. */
export function isDevelopmentAuthEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "production" && env.DEV_AUTH_BYPASS_ENABLED?.trim().toLowerCase() === "true";
}
