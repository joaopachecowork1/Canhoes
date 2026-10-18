import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { makeEventContext } from "@/tests/component/eventContext";
import { post } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signIn, signOutUser } from "@/tests/component/session";

import { CanhoesComposeSheet } from "./CanhoesComposeSheet";

const POSTS = "*/api/v1/events/event-1/feed/posts";
const png = (name = "foto.png") => new File(["png"], name, { type: "image/png" });

function renderSheet() {
  server.use(http.get("*/api/v1/events/active/context", () => HttpResponse.json(makeEventContext({ modules: { feed: true } }))));
  const onDone = vi.fn();
  const onOpenChange = vi.fn();
  const view = renderWithProviders(<CanhoesComposeSheet open onOpenChange={onOpenChange} onDone={onDone} />);
  const fileInput = () => view.baseElement.querySelector<HTMLInputElement>('input[type="file"]');
  return { ...view, onDone, onOpenChange, fileInput };
}

/** Captures the JSON body of the create-post request. */
function capturePost() {
  const sent: unknown[] = [];
  server.use(
    http.post(POSTS, async ({ request }) => {
      sent.push(await request.json());
      return HttpResponse.json(post({ id: "new" }));
    })
  );
  return sent;
}

describe("CanhoesComposeSheet", () => {
  it("asks visitors to sign in", async () => {
    signOutUser();
    renderSheet();
    await userEvent.click(screen.getByRole("button", { name: "Entrar com Google" }));
    expect(signIn).toHaveBeenCalledWith("google", expect.anything());
  });

  it("publishes a text post and closes", async () => {
    const sent = capturePost();
    const { onDone, onOpenChange } = renderSheet();
    const submit = screen.getByRole("button", { name: "Publicar no mural" });

    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Escreve uma nota rápida/), "  Olá grupo  ");
    await userEvent.click(submit);

    expect(await screen.findByText("Post publicado")).toBeInTheDocument();
    expect(sent).toEqual([{ text: "Olá grupo", mediaUrls: [], pollOptions: null, pollQuestion: null }]);
    expect(onDone).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("needs a question and two options before publishing a poll", async () => {
    const sent = capturePost();
    renderSheet();
    await userEvent.type(screen.getByPlaceholderText(/Escreve uma nota rápida/), "Votem");
    await userEvent.click(screen.getByRole("button", { name: "Sondagem" }));
    const submit = screen.getByRole("button", { name: "Publicar no mural" });

    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText(/Qual foi o momento/), "Quem ganha?");
    await userEvent.type(screen.getByPlaceholderText("Opção 1"), "Ana");
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText("Opção 2"), "Rui");
    await userEvent.click(screen.getByRole("button", { name: "Adicionar opção" }));
    await userEvent.click(submit);

    await screen.findByText("Post publicado");
    expect(sent).toEqual([{ text: "Votem", mediaUrls: [], pollQuestion: "Quem ganha?", pollOptions: ["Ana", "Rui"] }]);
  });

  it("uploads the picked images before creating the post", async () => {
    const sent = capturePost();
    server.use(http.post("*/api/v1/events/event-1/feed/uploads", () => HttpResponse.json({ files: [{ url: "/uploads/1.png" }, { url: "/uploads/2.png" }] })));
    const { fileInput } = renderSheet();

    await userEvent.upload(fileInput()!, [png("a.png"), png("b.png")]);
    expect(screen.getByText("2/4")).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Mover imagem para a direita" })[0]);
    expect(screen.getAllByRole("img").map((image) => image.getAttribute("alt"))).toEqual(["b.png", "a.png"]);

    await userEvent.type(screen.getByPlaceholderText(/Escreve uma nota rápida/), "Fotos");
    await userEvent.click(screen.getByRole("button", { name: "Publicar no mural" }));

    await screen.findByText("Post publicado");
    expect(sent).toEqual([expect.objectContaining({ mediaUrls: ["/uploads/1.png", "/uploads/2.png"] })]);
  });

  it("refuses files that are not images and lets you remove picked ones", async () => {
    const { fileInput } = renderSheet();
    await userEvent.upload(fileInput()!, [png()], { applyAccept: false });
    await userEvent.upload(fileInput()!, [new File(["x"], "notas.txt", { type: "text/plain" })], { applyAccept: false });

    expect(await screen.findByText("notas.txt: formato não suportado")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover imagem" }));
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("explains when the images are too heavy to publish", async () => {
    server.use(http.post("*/api/v1/events/event-1/feed/uploads", () => HttpResponse.json({ message: "Payload Too Large" }, { status: 413 })));
    const { fileInput } = renderSheet();
    await userEvent.upload(fileInput()!, [png()]);
    await userEvent.type(screen.getByPlaceholderText(/Escreve uma nota rápida/), "Pesado");
    await userEvent.click(screen.getByRole("button", { name: "Publicar no mural" }));

    expect(await screen.findByText(/As imagens escolhidas são demasiado pesadas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar no mural" })).toBeEnabled();
  });
});
