"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Shield, Gift, ScrollText, Ruler, Sticker, Medal } from "lucide-react";

export function CanhoesMoreSheet({
  open,
  onOpenChange,
  isAdmin,
  onNavigate,
}: Readonly<{
  open: boolean;
  onOpenChange: (o: boolean) => void;
  isAdmin: boolean;
  onNavigate: (href: string) => void;
}>) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-t border-jungle-500/30 bg-[linear-gradient(180deg,rgba(9,22,15,0.98)_0%,rgba(7,13,10,0.98)_100%)]"
        /* 16px fallback gives breathing room on devices that don't support safe-area-inset-bottom */
        style={{ paddingBottom: "env(safe-area-inset-bottom, 16px)" }}
      >
        <SheetHeader className="pb-1.5">
          <SheetTitle>Mais</SheetTitle>
        </SheetHeader>

        <div className="grid grid-cols-2 gap-1.5 p-3 pt-0 sm:gap-2 sm:p-4 sm:pt-0">
          <Item label="Stickers" icon={<Sticker className="h-4 w-4" />} onClick={() => onNavigate("/canhoes/stickers")} />
          <Item label="Wishlist" icon={<Gift className="h-4 w-4" />} onClick={() => onNavigate("/canhoes/wishlist")} />
          <Item label="Amigo Secreto" icon={<Gift className="h-4 w-4" />} onClick={() => onNavigate("/canhoes/amigo-secreto")} />
          <Item label="Gala" icon={<Medal className="h-4 w-4" />} onClick={() => onNavigate("/canhoes/gala")} />
          <Item label="Medidas" icon={<Ruler className="h-4 w-4" />} onClick={() => onNavigate("/canhoes/medidas")} />
          <Item label="Nomeações" icon={<ScrollText className="h-4 w-4" />} onClick={() => onNavigate("/canhoes/nomeacoes")} />
        </div>

        {isAdmin && (
          <>
            <Separator />
            <div className="p-3 pb-0 sm:p-4 sm:pb-0">
              <Button className="canhoes-tap w-full h-9" onClick={() => onNavigate("/canhoes/admin")}>
                <Shield className="h-4 w-4 mr-2" /> Admin
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Item({
  label,
  icon,
  onClick,
}: Readonly<{
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}>) {
  return (
    <button
      onClick={onClick}
      className="canhoes-chip canhoes-tap flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-[13px] sm:text-sm text-jungle-100 transition-all hover:brightness-110"
    >
      {icon}
      <span className="font-medium truncate">{label}</span>
    </button>
  );
}
