import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AwardCategoryDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { category, paged } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesCategoriesModule } from "./CanhoesCategoriesModule";

const categories = [
  category(),
  category({ id: "cat-2", name: "Melhor Foto", description: "A foto mais icónica", isActive: false }),
];

function renderCategories({
  initialCategories = categories,
  phaseType = "PROPOSALS",
}: { initialCategories?: AwardCategoryDto[] | null; phaseType?: string } = {}) {
  return renderWithProviders(
    <CanhoesCategoriesModule
      initialContext={makeEventContext({ phaseType, modules: { categories: true } })}
      initialCategories={initialCategories ?? undefined}
    />,
  );
}

describe("CanhoesCategoriesModule", () => {
  it("lists the categories with their state and a fallback description", () => {
    renderCategories();

    expect(screen.getByText("Canhão do Ano")).toBeInTheDocument();
    expect(screen.getByText("Sem descrição adicional.")).toBeInTheDocument();
    expect(screen.getByText("A foto mais icónica")).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("Inativa")).toBeInTheDocument();
  });

  it("filters by name or description", async () => {
    renderCategories();

    await userEvent.type(screen.getByPlaceholderText("Procurar categoria oficial"), "ICÓNICA");

    expect(screen.getByText("Melhor Foto")).toBeInTheDocument();
    expect(screen.queryByText("Canhão do Ano")).not.toBeInTheDocument();
  });

  it("shows an empty state without categories", () => {
    renderCategories({ initialCategories: [] });
    expect(screen.getByText("Ainda não há categorias")).toBeInTheDocument();
  });

  it("shows the load error", async () => {
    server.use(apiRoute("get", "events/event-1/categories", { message: "boom" }, 500));
    renderCategories({ initialCategories: null });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Não deu para abrir as categorias")).toBeInTheDocument();
  });

  it("needs a name of three letters before proposing", async () => {
    renderCategories();
    const submit = screen.getByRole("button", { name: "Propor" });

    await userEvent.type(screen.getByLabelText("Nome"), "Ab");
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Nome"), "c");
    expect(submit).toBeEnabled();
  });

  it("sends the proposal, clears the form and refreshes the list", async () => {
    const recorder = recordRequests();
    server.use(
      http.post("*/api/v1/events/event-1/proposals", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json({ id: "proposal-1" });
      }),
      apiRoute("get", "events/event-1/categories", paged(categories)),
    );
    renderCategories();

    await userEvent.type(screen.getByLabelText("Nome"), "  Melhor sticker  ");
    await userEvent.type(screen.getByLabelText("Descrição"), "O mais usado");
    await userEvent.click(screen.getByRole("button", { name: "Propor" }));

    expect(await screen.findByText("Proposta enviada")).toBeInTheDocument();
    expect(recorder.requests[0]).toMatchObject({
      method: "POST",
      body: { name: "Melhor sticker", description: "O mais usado", kind: 0 },
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("");
  });

  it("keeps the form and warns when the proposal fails", async () => {
    server.use(apiRoute("post", "events/event-1/proposals", { message: "Já existe uma categoria assim." }, 409));
    renderCategories();

    await userEvent.type(screen.getByLabelText("Nome"), "Melhor sticker");
    await userEvent.click(screen.getByRole("button", { name: "Propor" }));

    expect(await screen.findByText(/Já existe uma categoria assim/)).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Melhor sticker");
  });

  it("closes proposals outside the proposals phase", () => {
    renderCategories({ phaseType: "VOTING" });
    expect(screen.getByRole("button", { name: "Propostas fechadas" })).toBeDisabled();
  });
});
