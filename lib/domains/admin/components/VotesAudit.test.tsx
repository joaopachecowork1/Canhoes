import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";

import { vote } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { queryKeys } from "@/lib/queryKeys";

import { VotesAudit } from "./VotesAudit";

describe("VotesAudit", () => {
  it("is refetched when the admin refreshes the edition after a write", async () => {
    let requests = 0;
    server.use(
      http.get("*/api/v1/events/event-1/admin/votes/paged", () => {
        requests += 1;
        return HttpResponse.json({ total: 1, votes: [vote()], skip: 0, take: 1000, hasMore: false });
      }),
    );
    const { queryClient } = renderWithProviders(<VotesAudit eventId="event-1" />);
    expect(await screen.findByText("Canhão do Ano")).toBeInTheDocument();

    await Promise.all(
      queryKeys.admin.afterWrite("event-1").map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );

    await waitFor(() => expect(requests).toBe(2));
  });
});
