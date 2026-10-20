import "react";

declare module "react" {
  interface CSSProperties {
    /** A cor da área atual, definida por CanhoesChrome e lida pelos componentes que a usam. */
    "--area"?: string;
    /** Variáveis do tema dos toasts do Sonner, definidas em `components/ui/sonner.tsx`. */
    "--normal-bg"?: string;
    "--normal-text"?: string;
    "--normal-border"?: string;
    "--border-radius"?: string;
  }
}
