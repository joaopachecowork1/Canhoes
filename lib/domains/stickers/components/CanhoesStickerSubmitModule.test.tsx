import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { category, nominee, paged } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesStickerSubmitModule } from "./CanhoesStickerSubmitModule";

const stickerCategory = category({ id: "cat-sticker", name: "Sticker do ano", kind: 2 });
const approved = [
  nominee({ id: "s1", title: "Sticker lendário", imageUrl: "/uploads/s1.png", createdAtUtc: new Date().toISOString() }),
  nominee({ id: "s2", title: "Sem imagem", imageUrl: null }),
];

function renderStickers({ phaseType = "PROPOSALS", stickers = approved } = {}) {
  return renderWithProviders(
    <CanhoesStickerSubmitModule
      initialContext={makeEventContext({ phaseType, modules: { stickers: true } })}
      initialStickerCategories={[stickerCategory, category()]}
      initialApprovedNominees={stickers}
    />
  );
}

const titleInput = () => screen.getByLabelText("Título");
const openForm = () => userEvent.click(screen.getByRole("button", { name: "Enviar um sticker" }));
const submitButton = () => screen.getByRole("button", { name: "Enviar sticker" });
const fileInput = () => document.querySelector<HTMLInputElement>('input[type="file"]');

describe("CanhoesStickerSubmitModule", () => {
  it("shows only the approved stickers that have an image", () => {
    renderStickers();

    expect(screen.getByRole("img", { name: "Sticker lendário" })).toBeInTheDocument();
    expect(screen.getByText("Agora mesmo")).toBeInTheDocument();
    expect(screen.queryByText("Sem imagem")).not.toBeInTheDocument();
  });

  it("shows the gallery first and keeps the form behind a button", async () => {
    renderStickers();
    expect(screen.queryByLabelText("Título")).not.toBeInTheDocument();

    await openForm();
    expect(await screen.findByRole("dialog", { name: "Enviar um novo sticker" })).toBeInTheDocument();
    expect(titleInput()).toBeInTheDocument();
  });

  it("names the category select with its visible label", async () => {
    renderStickers();
    await openForm();
    expect(screen.getByRole("combobox", { name: "Categoria" })).toBeInTheDocument();
  });

  it("shows an empty gallery", () => {
    renderStickers({ stickers: [] });
    expect(screen.getByText("Ainda não há stickers")).toBeInTheDocument();
  });

  it("sends the sticker, uploads its image and refreshes the gallery", async () => {
    const recorder = recordRequests();
    server.use(
      http.post("*/api/v1/events/event-1/nominations", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(nominee({ id: "new", status: "pending" }));
      }),
      http.post("*/api/v1/events/event-1/nominations/new/upload", () => HttpResponse.json(nominee({ id: "new" }))),
      apiRoute("get", "events/event-1/categories", paged([stickerCategory])),
      apiRoute("get", "events/event-1/nominations/approved", approved)
    );
    renderStickers();

    await openForm();
    await userEvent.type(titleInput(), " O clássico ");
    const input = fileInput();
    if (!input) throw new Error("No file input.");
    await userEvent.upload(input, new File(["png"], "sticker.png", { type: "image/png" }));
    expect(screen.getByText("sticker.png")).toBeInTheDocument();
    await userEvent.click(submitButton());

    expect(await screen.findByText("Sticker enviado!")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ categoryId: null, title: "O clássico", kind: "stickers" });
    await waitFor(() => expect(screen.queryByLabelText("Título")).not.toBeInTheDocument());
  });

  it("keeps the sticker and says so when only its image fails, so a retry cannot duplicate it", async () => {
    const recorder = recordRequests();
    server.use(
      http.post("*/api/v1/events/event-1/nominations", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(nominee({ id: "new", status: "pending" }));
      }),
      apiRoute("post", "events/event-1/nominations/new/upload", { message: "Imagem inválida." }, 400),
      apiRoute("get", "events/event-1/categories", paged([stickerCategory])),
      apiRoute("get", "events/event-1/nominations/approved", approved)
    );
    renderStickers();

    await openForm();
    await userEvent.type(titleInput(), "O clássico");
    const input = fileInput();
    if (!input) throw new Error("No file input.");
    await userEvent.upload(input, new File(["png"], "sticker.png", { type: "image/png" }));
    await userEvent.click(submitButton());

    expect(await screen.findByText(/a imagem não subiu/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText("Título")).not.toBeInTheDocument());
    expect(recorder.requests).toHaveLength(1);
  });

  it("refuses files that are not images", async () => {
    renderStickers();
    await openForm();
    const input = fileInput();
    if (!input) throw new Error("No file input.");

    await userEvent.upload(input, new File(["x"], "notas.txt", { type: "text/plain" }), { applyAccept: false });
    expect(await screen.findByText("Só podes enviar imagens")).toBeInTheDocument();
  });

  it("warns when the submission fails", async () => {
    server.use(apiRoute("post", "events/event-1/nominations", { message: "Fechado." }, 409));
    renderStickers();

    await openForm();
    await userEvent.type(titleInput(), "O clássico");
    await userEvent.click(submitButton());

    expect(await screen.findByText(/Fechado/)).toBeInTheDocument();
    expect(titleInput()).toHaveValue("O clássico");
  });

  it("closes the form outside the proposals phase", () => {
    renderStickers({ phaseType: "VOTING" });
    expect(screen.getByRole("button", { name: "Envio de stickers fechado" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Enviar um sticker" })).not.toBeInTheDocument();
  });

  it("shows the load error", async () => {
    server.use(
      apiRoute("get", "events/event-1/categories", { message: "boom" }, 500),
      apiRoute("get", "events/event-1/nominations/approved", [])
    );
    renderWithProviders(<CanhoesStickerSubmitModule initialContext={makeEventContext({ modules: { stickers: true } })} />);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Não deu para abrir os stickers")).toBeInTheDocument();
  });
});
