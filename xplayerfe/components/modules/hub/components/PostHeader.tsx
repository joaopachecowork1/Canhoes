"use client";

import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pin, Trash2 } from "lucide-react";
import { formatDateTime, initials } from "./hubUtils";

export function PostHeader({
  authorName,
  createdAtUtc,
  isPinned,
  isAdmin,
  onAdminPin,
  onAdminDelete,
}: Readonly<{
  authorName: string;
  createdAtUtc: string;
  isPinned?: boolean;
  isAdmin?: boolean;
  onAdminPin?: () => void;
  onAdminDelete?: () => void;
}>) {
  return (
    <div className="flex items-start justify-between gap-2.5">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-jungle-300/40 shadow-[0_0_14px_rgba(74,255,149,0.22)]">
          <AvatarFallback>{initials(authorName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-[13px] sm:text-sm font-semibold text-jungle-50 truncate">{authorName}</div>
          <div className="text-xs text-jungle-300/70">{formatDateTime(createdAtUtc)}</div>
        </div>
        {isPinned && <Badge variant="secondary" className="canhoes-chip border-jungle-300/45 text-jungle-100">Fixado</Badge>}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="canhoes-chip canhoes-tap h-8 w-8 px-0 text-jungle-100" onClick={onAdminPin} title="Fixar / Desafixar">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="canhoes-chip canhoes-tap h-8 w-8 px-0 text-jungle-100" onClick={onAdminDelete} title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
