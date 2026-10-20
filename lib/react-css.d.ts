import "react";

declare module "react" {
  interface CSSProperties {
    /** The current area's colour, set by CanhoesChrome and read by area-aware components. */
    "--area"?: string;
    /** Sonner's toast theme variables, set in `components/ui/sonner.tsx`. */
    "--normal-bg"?: string;
    "--normal-text"?: string;
    "--normal-border"?: string;
    "--border-radius"?: string;
  }
}
