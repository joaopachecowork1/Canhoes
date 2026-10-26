"use client";

import type { PublicUserDto } from "@/lib/api/types";
import { UserMinus } from "lucide-react";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/** Os membros do evento, um por linha, com um interruptor que os torna admin e um botão que tira os não-admins do evento. */
export function AdminMembersList({
  isBusy,
  members,
  onRemove,
  onToggleRole,
}: Readonly<{
  isBusy: boolean;
  members: PublicUserDto[];
  onRemove: (member: { id: string; name: string }) => void;
  onToggleRole: (member: { id: string; isAdmin: boolean }) => void;
}>) {
  return (
    <ul className="divide-y divide-[var(--border-paper)]">
      {members.map((member) => (
        <li key={member.id} className="flex min-h-14 items-center gap-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold">{member.displayName || member.email}</p>
            <p className="truncate text-sm text-[var(--color-text-muted)]">{member.email}</p>
          </div>
          <span className="text-sm text-[var(--color-text-muted)]">{messages.shell.canhoesNavigation.adminLabel}</span>
          <Switch
            aria-label={formatMessage(messages.admin.AdminMembersSection.adminSwitchLabel, {
              name: member.displayName || member.email,
            })}
            checked={member.isAdmin}
            disabled={isBusy}
            onCheckedChange={() => onToggleRole(member)}
            variant="admin"
          />
          {member.isAdmin ? null : (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11"
              disabled={isBusy}
              aria-label={formatMessage(messages.admin.AdminMembersSection.removeLabel, {
                name: member.displayName || member.email,
              })}
              onClick={() => onRemove({ id: member.id, name: member.displayName || member.email })}
            >
              <UserMinus aria-hidden className="size-5" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
