"use client";

import type { PublicUserDto } from "@/lib/api/types";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";
import { Switch } from "@/components/ui/switch";

/** The event's members, one per row, with a switch that makes them admin. */
export function AdminMembersList({
  isPendingRoleChange,
  members,
  onToggleRole,
}: Readonly<{
  isPendingRoleChange: boolean;
  members: PublicUserDto[];
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
            disabled={isPendingRoleChange}
            onCheckedChange={() => onToggleRole(member)}
            variant="admin"
          />
        </li>
      ))}
    </ul>
  );
}
