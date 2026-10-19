import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { EventVotingBoardDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { votingBoard, votingCategory } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesOfficialVotingModule } from "./CanhoesOfficialVotingModule";

const bestCanhao = votingCategory();
const bestCanhoVoted = { ...bestCanhao, myOptionId: "opt-rui" };
const bestPhoto = votingCategory({ id: "cat-2", title: "Melhor Foto", options: [{ id: "opt-praia", label: "Praia", imageUrl: null }] });

function renderVoting(initialData: EventVotingBoardDto | null = votingBoard([bestCanhao, bestPhoto])) {
  return renderWithProviders(
    <CanhoesOfficialVotingModule initialData={initialData ?? undefined} initialContext={makeEventContext({ phaseType: "VOTING", modules: { voting: true } })} />
  );
}

describe("CanhoesOfficialVotingModule", () => {
  it("shows the first category's options and switches category from the tabs", async () => {
    renderVoting();

    expect(screen.getByText("Votaste em 0 de 2 categorias oficiais")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ana" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Melhor Foto" }));
    expect(screen.getByRole("button", { name: "Praia" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ana" })).not.toBeInTheDocument();
  });

  it("marks the chosen option as stuck in, like a filled album slot", () => {
    renderVoting(votingBoard([bestCanhoVoted, bestPhoto]));

    expect(screen.getByRole("button", { name: "Rui" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ana" })).toHaveAttribute("aria-pressed", "false");
  });

  it("sends the vote and counts it before the server answers", async () => {
    const recorder = recordRequests();
    let resolveVote = () => {};
    server.use(
      http.post("*/api/v1/events/event-1/votes", async ({ request }) => {
        await recorder.capture(request);
        await new Promise<void>((resolve) => (resolveVote = resolve));
        return new HttpResponse(null, { status: 204 });
      }),
      apiRoute("get", "events/event-1/voting", votingBoard([{ ...bestCanhao, myOptionId: "opt-rui" }, bestPhoto]))
    );
    renderVoting();

    await userEvent.click(screen.getByRole("button", { name: "Rui" }));

    expect(await screen.findByText("Votaste em 1 de 2 categorias oficiais")).toBeInTheDocument();
    resolveVote();
    expect(recorder.requests).toEqual([
      { method: "POST", url: "/api/v1/events/event-1/votes", body: { categoryId: "cat-1", selectionId: "opt-rui" } },
    ]);
    expect(within(screen.getByRole("button", { name: /Canhão do Ano/ })).getByText("Votado")).toBeInTheDocument();
  });

  it("undoes the vote and warns when the server refuses it", async () => {
    server.use(apiRoute("post", "events/event-1/votes", { message: "Votação fechada." }, 409));
    renderVoting();

    await userEvent.click(screen.getByRole("button", { name: "Rui" }));

    expect(await screen.findByText(/Votação fechada/)).toBeInTheDocument();
    expect(screen.getByText("Votaste em 0 de 2 categorias oficiais")).toBeInTheDocument();
  });

  it("locks the options when the ballot is closed", () => {
    renderVoting(votingBoard([bestCanhao], false));

    expect(screen.getByText("Boletim encerrado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ana" })).toBeDisabled();
  });

  it("celebrates a complete ballot", () => {
    renderVoting(votingBoard([{ ...bestCanhao, myOptionId: "opt-ana" }]));
    expect(screen.getByText("Boletim oficial completo")).toBeInTheDocument();
  });

  it("offers a retry when the ballot fails to load", async () => {
    server.use(apiRoute("get", "events/event-1/voting", { message: "Falhou" }, 500));
    renderVoting(null);

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Erro ao carregar boletim oficial")).toBeInTheDocument();
    expect(within(alert).getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
