import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { renderWithProviders } from "@/tests/component/renderWithProviders";

import { CommentForm } from "./CommentForm";

const baseProps = {
  currentUserName: "Ana",
  isReplying: false,
  onCancelReply: vi.fn(),
  onDraftChange: vi.fn(),
  onSubmit: vi.fn(),
  postId: "post-1",
  replyingToName: null,
};

describe("CommentForm", () => {
  it("keeps send and clear disabled for an empty draft", () => {
    renderWithProviders(<CommentForm {...baseProps} draft="   " />);
    expect(screen.getByRole("button", { name: "Enviar resposta" })).toBeDisabled();
  });

  it("sends a filled draft and clears it on request", async () => {
    const onSubmit = vi.fn();
    const onDraftChange = vi.fn();
    renderWithProviders(
      <CommentForm {...baseProps} draft="Grande post" onSubmit={onSubmit} onDraftChange={onDraftChange} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));
    await userEvent.click(screen.getByRole("button", { name: "Limpar" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onDraftChange).toHaveBeenCalledWith("");
  });

  it("says whom the reply answers and lets you cancel it", async () => {
    const onCancelReply = vi.fn();
    renderWithProviders(
      <CommentForm {...baseProps} draft="" isReplying replyingToName="Rui" onCancelReply={onCancelReply} />,
    );

    expect(screen.getByText("Rui")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Escreve a tua resposta...")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar resposta" }));
    expect(onCancelReply).toHaveBeenCalledOnce();
  });
});
