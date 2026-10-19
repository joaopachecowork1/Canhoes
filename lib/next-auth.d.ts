import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    authMode?: "google" | "development" | "credentials";
    user: {
      id: string;
      isAdmin?: boolean;
      /** Palette key of the member's colour. */
      color?: string;
    } & import("next-auth").DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    dbUserId?: string;
    externalId?: string;
    authMode?: "google" | "development" | "credentials";
    isAdmin?: boolean;
    color?: string;
  }
}
