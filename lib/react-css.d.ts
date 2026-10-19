import "react";

declare module "react" {
  interface CSSProperties {
    /** The current area's colour, set by CanhoesChrome and read by area-aware components. */
    "--area"?: string;
  }
}
