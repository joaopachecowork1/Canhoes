/** True outside production when `DEV_AUTH_BYPASS_ENABLED=true`: enables the one-click development admin login. */
export function isDevelopmentAuthEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env.NODE_ENV !== "production" && env.DEV_AUTH_BYPASS_ENABLED?.trim().toLowerCase() === "true";
}
