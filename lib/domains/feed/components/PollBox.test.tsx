import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PollBox } from "./PollBox";

const poll = {
  question: "Carne ou peixe?",
  options: [
    { id: "o1", text: "Carne", voteCount: 2 },
    { id: "o2", text: "Peixe", voteCount: 0 },
  ],
  myOptionId: "o1",
  totalVotes: 2,
};

describe("PollBox", () => {
  it("names each option by the text it shows, so voice control can say it", () => {
    render(<PollBox poll={poll} onVote={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Carne.*2 · 100%/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /^Peixe/ })).toHaveAttribute("aria-pressed", "false");
  });

  it("votes for the option that was tapped", async () => {
    const onVote = vi.fn();
    render(<PollBox poll={poll} onVote={onVote} />);
    await userEvent.click(screen.getByRole("button", { name: /^Peixe/ }));
    expect(onVote).toHaveBeenCalledWith("o2");
  });
});
