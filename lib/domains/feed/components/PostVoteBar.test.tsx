import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PostVoteBar } from "./PostVoteBar";

describe("PostVoteBar", () => {
  it("shows the score and votes up or down", async () => {
    const onUpvote = vi.fn();
    const onDownvote = vi.fn();
    render(<PostVoteBar isUpvoted={false} isDownvoted={false} onUpvote={onUpvote} onDownvote={onDownvote} score={3} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Upvote" }));
    await userEvent.click(screen.getByRole("button", { name: "Downvote" }));

    expect(onUpvote).toHaveBeenCalledOnce();
    expect(onDownvote).toHaveBeenCalledOnce();
  });

  it("offers to undo an active upvote", () => {
    render(<PostVoteBar isUpvoted isDownvoted={false} onUpvote={vi.fn()} onDownvote={vi.fn()} score={1} />);
    expect(screen.getByRole("button", { name: "Remover upvote" })).toBeInTheDocument();
  });
});
