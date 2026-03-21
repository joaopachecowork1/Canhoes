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
        <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
          <AvatarFallback>{initials(authorName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-[13px] sm:text-sm font-medium truncate">{authorName}</div>
          <div className="text-xs text-muted-foreground">{formatDateTime(createdAtUtc)}</div>
        </div>
        {isPinned && <Badge variant="secondary">Fixado</Badge>}
      </div>

      {isAdmin && (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="canhoes-tap h-8 w-8 px-0" onClick={onAdminPin} title="Fixar / Desafixar">
            <Pin className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="canhoes-tap h-8 w-8 px-0" onClick={onAdminDelete} title="Eliminar">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
