import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { GalaMeasureDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { measure, measureProposal } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";

import { CanhoesMeasuresModule } from "./CanhoesMeasuresModule";

const measures = [measure(), measure({ id: "m-2", text: "Quem chegar atrasado canta" })];

function renderMeasures({ initialData = measures, phaseType = "PROPOSALS" }: { initialData?: GalaMeasureDto[]; phaseType?: string } = {}) {
  return renderWithProviders(
    <CanhoesMeasuresModule initialData={initialData} initialContext={makeEventContext({ phaseType, modules: { measures: true } })} />
  );
}

const submitButton = () => screen.getByRole("button", { name: "Propor medida" });

describe("CanhoesMeasuresModule", () => {
  it("lists the approved measures and filters them", async () => {
    renderMeasures();
    expect(screen.getByText("Ninguém sai antes da meia-noite")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Procurar medida"), "CANTA");

    expect(screen.getByText("Quem chegar atrasado canta")).toBeInTheDocument();
    expect(screen.queryByText("Ninguém sai antes da meia-noite")).not.toBeInTheDocument();
  });

  it("fetches when the server sent no measures and shows the empty state", async () => {
    server.use(apiRoute("get", "events/event-1/measures", []));
    renderMeasures({ initialData: [] });

    expect(await screen.findByText("Ainda não há medidas")).toBeInTheDocument();
  });

  it("shows the load error", async () => {
    server.use(apiRoute("get", "events/event-1/measures", { message: "boom" }, 500));
    renderMeasures({ initialData: [] });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Não deu para abrir as medidas")).toBeInTheDocument();
  });

  it("needs five letters before proposing", async () => {
    renderMeasures();

    await userEvent.type(screen.getByLabelText("Texto"), "    Abcd");
    expect(submitButton()).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Texto"), "e");
    expect(submitButton()).toBeEnabled();
  });

  it("sends the trimmed proposal and clears the form", async () => {
    const recorder = recordRequests();
    server.use(
      http.post("*/api/v1/events/event-1/measures", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(measureProposal());
      })
    );
    renderMeasures();

    await userEvent.type(screen.getByLabelText("Texto"), " Quem perder paga uma rodada ");
    await userEvent.click(submitButton());

    expect(await screen.findByText("Medida proposta")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ text: "Quem perder paga uma rodada" });
    expect(screen.getByLabelText("Texto")).toHaveValue("");
  });

  it("keeps the text and warns when the proposal fails", async () => {
    server.use(apiRoute("post", "events/event-1/measures", { message: "Já foi proposta." }, 409));
    renderMeasures();

    await userEvent.type(screen.getByLabelText("Texto"), "Quem perder paga");
    await userEvent.click(submitButton());

    expect(await screen.findByText(/Já foi proposta/)).toBeInTheDocument();
    expect(screen.getByLabelText("Texto")).toHaveValue("Quem perder paga");
  });

  it("closes proposals outside the proposals phase", () => {
    renderMeasures({ phaseType: "VOTING" });

    expect(submitButton()).toHaveTextContent("Propostas fechadas");
    expect(submitButton()).toBeDisabled();
  });
});
