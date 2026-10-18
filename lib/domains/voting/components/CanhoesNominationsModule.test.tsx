import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { MyNominationStatusDto, NomineeDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { category, nominee, paged } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesNominationsModule } from "./CanhoesNominationsModule";

const NOMINATIONS = "events/event-1/nominations";
const categories = [category(), category({ id: "cat-2", name: "Melhor Foto" })];
const noNomination: MyNominationStatusDto = { hasNomination: false, categoryId: null, status: null, nomineeId: null, nomineeTitle: null };

function serveNominations({ myStatus = noNomination, approved = [] }: { myStatus?: MyNominationStatusDto; approved?: NomineeDto[] } = {}) {
  server.use(
    apiRoute("get", `${NOMINATIONS}/my-status`, myStatus),
    apiRoute("get", `${NOMINATIONS}/approved`, approved),
    apiRoute("get", "events/event-1/categories", paged(categories))
  );
}

function renderNominations(phaseType = "PROPOSALS") {
  return renderWithProviders(
    <CanhoesNominationsModule initialCategories={categories} initialContext={makeEventContext({ phaseType, modules: { nominees: true } })} />
  );
}

const titleInput = () => screen.getByPlaceholderText("Ex.: Nome da pessoa ou item");

describe("CanhoesNominationsModule", () => {
  it("shows the approved nominations of the selected category only", async () => {
    serveNominations({
      approved: [nominee({ id: "n1", categoryId: "cat-1", title: "Ana" }), nominee({ id: "n2", categoryId: "cat-2", title: "Praia" })],
    });
    renderNominations();

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText("Praia")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Melhor Foto" }));
    expect(screen.getByText("Praia")).toBeInTheDocument();
  });

  it("shows the nomination you already sent, as the server returns it", async () => {
    serveNominations({
      myStatus: { hasNomination: true, categoryId: "cat-1", status: "pending", nomineeId: "nominee-9", nomineeTitle: "Rui" },
    });
    renderNominations();

    expect(await screen.findByText("Aguarda aprovação")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Canhão do Ano/ })).getByText("Enviado")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Ex.: Nome da pessoa ou item")).not.toBeInTheDocument();
  });

  it("sends a nomination and shows it as pending", async () => {
    serveNominations();
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${NOMINATIONS}`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(nominee({ id: "nominee-new", title: "Rui", status: "pending" }));
      })
    );
    renderNominations();

    await userEvent.type(await screen.findByPlaceholderText("Ex.: Nome da pessoa ou item"), " Rui ");
    await userEvent.click(screen.getByRole("button", { name: "Submeter" }));

    expect(await screen.findByText("Nomeação submetida. Aguarda aprovação.")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ categoryId: "cat-1", title: "Rui" });
    expect(screen.getByText("Aguarda aprovação")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Canhão do Ano/ })).getByText("Enviado")).toBeInTheDocument();
  });

  it("brings the form back when the nomination fails", async () => {
    serveNominations();
    server.use(apiRoute("post", NOMINATIONS, { message: "Já nomeaste." }, 409));
    renderNominations();

    await userEvent.type(await screen.findByPlaceholderText("Ex.: Nome da pessoa ou item"), "Rui");
    await userEvent.click(screen.getByRole("button", { name: "Submeter" }));

    expect(await screen.findByText(/Já nomeaste/)).toBeInTheDocument();
    expect(titleInput()).toBeInTheDocument();
    expect(screen.queryByText("Aguarda aprovação")).not.toBeInTheDocument();
  });

  it("needs a title of two letters", async () => {
    serveNominations();
    renderNominations();

    await userEvent.type(await screen.findByPlaceholderText("Ex.: Nome da pessoa ou item"), "R");
    expect(screen.getByRole("button", { name: "Submeter" })).toBeDisabled();
    await userEvent.type(titleInput(), "u");
    expect(screen.getByRole("button", { name: "Submeter" })).toBeEnabled();
  });

  it("is closed outside the proposals phase", async () => {
    serveNominations();
    renderNominations("VOTING");
    expect(await screen.findByText("Nomeações oficiais fechadas")).toBeInTheDocument();
  });

  it("shows the load error", async () => {
    serveNominations();
    server.use(apiRoute("get", `${NOMINATIONS}/my-status`, { message: "boom" }, 500));
    renderNominations();

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Erro ao carregar nomeações oficiais")).toBeInTheDocument();
  });
});
