"use client";

import { cn } from "@/lib/utils";
import { Star, Trophy, Flame, Shield } from "lucide-react";

type Props = {
  pathname: string;
  onNavigate: (href: string) => void;
};

function active(pathname: string, href: string) {
  if (href === "/canhoes") return pathname === "/canhoes" || pathname === "/canhoes/" || pathname.startsWith("/canhoes/nomeacoes");
  return pathname.startsWith(href);
}

export function CanhoesBottomTabs({ pathname, onNavigate }: Readonly<Props>) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        borderTop: "1px solid rgba(0,255,68,0.15)",
        background: "linear-gradient(180deg, rgba(10,18,13,0.85) 0%, rgba(7,12,9,0.92) 100%)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="mx-auto max-w-2xl px-2">
        <div className="h-14 sm:h-16 grid grid-cols-4 items-center px-1">
          <Tab label="Nomeações" icon={<Star className="h-5 w-5" />} active={active(pathname, "/canhoes")} onClick={() => onNavigate("/canhoes")} />
          <Tab label="Categorias" icon={<Trophy className="h-5 w-5" />} active={active(pathname, "/canhoes/categorias")} onClick={() => onNavigate("/canhoes/categorias")} />
          <Tab label="Votação" icon={<Flame className="h-5 w-5" />} active={active(pathname, "/canhoes/votacao")} onClick={() => onNavigate("/canhoes/votacao")} />
          <Tab label="Admin" icon={<Shield className="h-5 w-5" />} active={active(pathname, "/canhoes/admin")} onClick={() => onNavigate("/canhoes/admin")} adminStyle />
        </div>
      </div>
    </nav>
  );
}

function Tab({ label, icon, active: isActive, onClick, adminStyle = false }: Readonly<{ label: string; icon: React.ReactNode; active: boolean; onClick: () => void; adminStyle?: boolean; }>) {
  const activeColor = adminStyle ? "#ffe135" : "#00ff44";
  const idleColor = adminStyle ? "rgba(255,225,53,0.35)" : "rgba(0,255,68,0.35)";
  const glowColor = adminStyle ? "rgba(255,225,53,0.5)" : "rgba(0,255,68,0.5)";
  return (
    <button
      onClick={onClick}
      style={{ color: isActive ? activeColor : idleColor, filter: isActive ? `drop-shadow(0 0 6px ${glowColor})` : "none", transition: "color 0.15s ease, filter 0.15s ease, transform 0.1s ease" }}
      className={cn("canhoes-tap h-full flex flex-col items-center justify-center gap-0.5 rounded-xl", "text-[10px] sm:text-[11px] font-bold")}
      aria-current={isActive ? "page" : undefined}
    >
      {icon}
      <span className="font-semibold tracking-wide" style={{ fontFamily: "'Nunito', sans-serif" }}>{label}</span>
      {isActive && <span className="h-0.5 w-5 rounded-full" style={{ background: activeColor, boxShadow: `0 0 6px ${glowColor}`, animation: "canhoes-ambient-float 2.5s ease-in-out infinite" }} />}
    </button>
  );
}
