"use client";

import { cn } from "@/lib/utils";
import { Flame, Leaf, Plus, Trophy, Sparkles } from "lucide-react";

type Props = {
  pathname: string;
  onNavigate: (href: string) => void;
  onCompose: () => void;
  onMore: () => void;
};

function active(pathname: string, href: string) {
  if (href === "/canhoes") return pathname === "/canhoes" || pathname === "/canhoes/";
  return pathname.startsWith(href);
}

export function CanhoesBottomTabs({ pathname, onNavigate, onCompose, onMore }: Readonly<Props>) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-jungle-400/20 bg-background/65 backdrop-blur-md supports-[backdrop-filter]:bg-background/55"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto max-w-2xl px-2">
        <div className="h-14 sm:h-16 grid grid-cols-5 items-center canhoes-glass rounded-t-2xl px-1">
          <Tab
            label="Início"
            icon={<Leaf className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
            active={active(pathname, "/canhoes")}
            onClick={() => onNavigate("/canhoes")}
          />

          <Tab
            label="Votações"
            icon={<Trophy className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
            active={active(pathname, "/canhoes/categorias")}
            onClick={() => onNavigate("/canhoes/categorias")}
          />

          <ComposeButton onClick={onCompose} />

          <Tab
            label="Forum"
            icon={<Flame className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
            active={active(pathname, "/canhoes/votacao")}
            onClick={() => onNavigate("/canhoes/votacao")}
          />

          <Tab
            label="Mais"
            icon={<Sparkles className="h-4.5 w-4.5 sm:h-5 sm:w-5" />}
            active={false}
            onClick={onMore}
          />
        </div>
      </div>
    </nav>
  );
}

function Tab({ label, icon, active, onClick }: Readonly<{ label: string; icon: React.ReactNode; active: boolean; onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "canhoes-tap h-full flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] sm:text-[11px] transition-all",
        active
          ? "text-jungle-100 canhoes-chip canhoes-float shadow-[0_0_20px_rgba(126,255,183,0.16)]"
          : "text-jungle-300/75 hover:text-jungle-100"
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className={cn(active && "font-semibold")}>{label}</span>
      {active ? <span className="mt-0.5 h-0.5 w-4 rounded-full bg-jungle-200/80" /> : null}
    </button>
  );
}

function ComposeButton({ onClick }: Readonly<{ onClick: () => void }>) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "canhoes-pulse canhoes-tap mx-auto -mt-5 sm:-mt-6 h-11 w-11 sm:h-12 sm:w-12 rounded-full",
        "bg-[radial-gradient(circle_at_30%_25%,#ffd18e_0%,#f59c45_45%,#dd6f2f_100%)] text-[#20150e] shadow-[0_8px_26px_rgba(221,111,47,0.45)]",
        "flex items-center justify-center",
        "border border-orange-200/35"
      )}
      aria-label="Criar"
      title="Criar post"
    >
      <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
    </button>
  );
}
