"use client";

import { PersonCromo } from "@/components/ui/person-cromo";
import { useEventMembers } from "@/lib/domains/event/hooks/useEventMembers";
import messages from "@/messages/pt.json";

/** The group's cromos in a horizontal strip, each member in their own colour. */
export function MemberCromoStrip({ eventId }: Readonly<{ eventId: string | null }>) {
  const { data: members = [] } = useEventMembers(eventId);

  if (members.length === 0) return null;

  return (
    <ul tabIndex={0} aria-label={messages.feed.HubFeedModule.membersLabel} className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {members.map((member) => {
        const name = member.displayName ?? member.email.split("@")[0];
        return (
          <li key={member.id} className="flex w-20 shrink-0 flex-col items-center gap-1">
            <PersonCromo name={name} color={member.color} size="lg" />
            <span className="w-full truncate text-center text-base text-[var(--color-text-secondary)]">{name}</span>
          </li>
        );
      })}
    </ul>
  );
}
