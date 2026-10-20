"use client";

import { Button } from "@/components/ui/button";
import messages from "@/messages/pt.json";

import { useStoredFlag, WELCOME_DISMISSED_STORAGE_KEY } from "../hooks/useStoredFlag";

const copy = messages.event.CanhoesWelcomeCard;

/** A one-time hello for a new member: what the app is and what to do first. Hidden for good once dismissed. */
export function CanhoesWelcomeCard() {
  // Hidden in the server render: someone who already dismissed it must not see it flash before hydration.
  const [isDismissed, setIsDismissed] = useStoredFlag(WELCOME_DISMISSED_STORAGE_KEY, true);
  if (isDismissed) return null;

  return (
    <section
      aria-labelledby="welcome-title"
      className="space-y-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--bg-paper)] px-4 py-4 shadow-[var(--shadow-elevation-sm)]"
    >
      <h2 id="welcome-title" className="text-xl font-bold text-[var(--text-primary)]">
        {copy.title}
      </h2>
      <p className="text-base text-[var(--text-secondary)]">{copy.intro}</p>
      <ol className="list-decimal space-y-1 pl-5 text-base text-[var(--text-secondary)]">
        {copy.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <Button type="button" variant="outline" onClick={() => setIsDismissed(true)}>
        {copy.dismiss}
      </Button>
    </section>
  );
}
