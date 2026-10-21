import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MyNominationDto, NomineeDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { category, nominee, paged } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesNominationsModule } from "./CanhoesNominationsModule";

const NOMINATIONS = "events/event-1/nominations";
const categories = [category(), category({ id: "cat-2", name: "Melhor Foto" })];

function serveNominations({ mine = [], approved = [] }: { mine?: MyNominationDto[]; approved?: NomineeDto[] } = {}) {
  server.use(
    apiRoute("get", `${NOMINATIONS}/my-status`, mine),
    apiRoute("get", `${NOMINATIONS}/approved`, approved),
    apiRoute("get", "events/event-1/categories", paged(categories)),
  );
}

function renderNominations(phaseType = "PROPOSALS", canSubmitProposal?: boolean) {
  return renderWithProviders(
    <CanhoesNominationsModule
      initialCategories={categories}
      initialContext={makeEventContext({ canSubmitProposal, phaseType, modules: { nominees: true } })}
    />,
  );
}

const titleInput = () => screen.getByPlaceholderText("Ex.: Nome da pessoa ou item");

describe("CanhoesNominationsModule", () => {
  it("offers only the categories that take nominations, not the ones voted on a person or a sticker", async () => {
    serveNominations();
    renderWithProviders(
      <CanhoesNominationsModule
        initialCategories={[
          category({ id: "nom", name: "Melhor Foto", kind: 0 }),
          category({ id: "person", name: "Pessoa do ano", kind: 1 }),
          category({ id: "sticker", name: "Sticker do ano", kind: 2 }),
        ]}
        initialContext={makeEventContext({ phaseType: "PROPOSALS", modules: { nominees: true } })}
      />,
    );

    expect(await screen.findByRole("button", { name: "Melhor Foto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pessoa do ano" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sticker do ano" })).not.toBeInTheDocument();
  });

  it("shows the approved nominations of the selected category only", async () => {
    serveNominations({
      approved: [
        nominee({ id: "n1", categoryId: "cat-1", title: "Ana" }),
        nominee({ id: "n2", categoryId: "cat-2", title: "Praia" }),
      ],
    });
    renderNominations();

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText("Praia")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Melhor Foto" }));
    expect(screen.getByText("Praia")).toBeInTheDocument();
  });

  it("shows the nominations you already sent, one per category", async () => {
    serveNominations({
      mine: [
        { categoryId: "cat-1", status: "pending", nomineeId: "nominee-9", nomineeTitle: "Rui" },
        { categoryId: "cat-2", status: "approved", nomineeId: "nominee-7", nomineeTitle: "A praia" },
      ],
    });
    renderNominations();

    expect(await screen.findByText("À espera do OK de um admin")).toBeInTheDocument();
    expect(screen.getByText("Rui")).toBeInTheDocument();
    for (const tab of [/Canhão do Ano/, /Melhor Foto/]) {
      expect(within(screen.getByRole("button", { name: tab })).getByText("Enviado")).toBeInTheDocument();
    }
    expect(screen.queryByPlaceholderText("Ex.: Nome da pessoa ou item")).not.toBeInTheDocument();
  });

  it("sends a nomination and shows it as pending", async () => {
    serveNominations();
    const recorder = recordRequests();
    // Like the server: once sent, the nomination is part of the user's list.
    server.use(
      http.post(`*/api/v1/${NOMINATIONS}`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(nominee({ id: "nominee-new", title: "Rui", status: "pending" }));
      }),
      http.get(`*/api/v1/${NOMINATIONS}/my-status`, () =>
        HttpResponse.json(
          recorder.requests.length > 0
            ? [{ categoryId: "cat-1", status: "pending", nomineeId: "nominee-new", nomineeTitle: "Rui" }]
            : [],
        ),
      ),
    );
    renderNominations();

    await userEvent.type(await screen.findByPlaceholderText("Ex.: Nome da pessoa ou item"), " Rui ");
    await userEvent.click(screen.getByRole("button", { name: "Enviar nomeação" }));

    expect(
      await screen.findByText("Nomeação enviada! Aparece na votação assim que um admin der o OK."),
    ).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ categoryId: "cat-1", title: "Rui" });
    expect(screen.getByText("À espera do OK de um admin")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Canhão do Ano/ })).getByText("Enviado")).toBeInTheDocument();
  });

  it("brings the form back when the nomination fails", async () => {
    serveNominations();
    server.use(apiRoute("post", NOMINATIONS, { message: "Já nomeaste." }, 409));
    renderNominations();

    await userEvent.type(await screen.findByPlaceholderText("Ex.: Nome da pessoa ou item"), "Rui");
    await userEvent.click(screen.getByRole("button", { name: "Enviar nomeação" }));

    expect(await screen.findByText(/Já nomeaste/)).toBeInTheDocument();
    expect(titleInput()).toBeInTheDocument();
    expect(screen.queryByText("À espera do OK de um admin")).not.toBeInTheDocument();
  });

  it("needs a title of two letters", async () => {
    serveNominations();
    renderNominations();

    await userEvent.type(await screen.findByPlaceholderText("Ex.: Nome da pessoa ou item"), "R");
    expect(screen.getByRole("button", { name: "Enviar nomeação" })).toBeDisabled();
    await userEvent.type(titleInput(), "u");
    expect(screen.getByRole("button", { name: "Enviar nomeação" })).toBeEnabled();
  });

  it("follows what the server allows, not the phase name", async () => {
    serveNominations();
    renderNominations("PROPOSALS", false);
    expect(await screen.findByText("As nomeações estão fechadas")).toBeInTheDocument();
  });

  it("opens for whoever the server lets propose, even outside the proposals phase", async () => {
    serveNominations();
    renderNominations("VOTING", true);
    expect(await screen.findByRole("button", { name: "Enviar nomeação" })).toBeInTheDocument();
  });

  it("is closed outside the proposals phase", async () => {
    serveNominations();
    renderNominations("VOTING");
    expect(await screen.findByText("As nomeações estão fechadas")).toBeInTheDocument();
  });

  it("shows the load error", async () => {
    serveNominations();
    server.use(apiRoute("get", `${NOMINATIONS}/my-status`, { message: "boom" }, 500));
    renderNominations();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Não deu para abrir as nomeações")).toBeInTheDocument();
  });
});
