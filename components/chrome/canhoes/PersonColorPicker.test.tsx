import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { recordRequests } from "@/tests/component/api";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signInAs, updateSession } from "@/tests/component/session";

import { PersonColorPicker } from "./PersonColorPicker";

describe("PersonColorPicker", () => {
  it("marks the member's colour and saves a new one", async () => {
    signInAs({ color: "teal" });
    const recorded = recordRequests();
    server.use(
      http.put("*/api/v1/me/color", async ({ request }) => {
        await recorded.capture(request);
        return HttpResponse.json({ color: "pink" });
      }),
    );
    const { queryClient } = renderWithProviders(<PersonColorPicker />);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    expect(screen.getByRole("radio", { name: "Turquesa" })).toBeChecked();
    await userEvent.click(screen.getByRole("radio", { name: "Rosa" }));

    await waitFor(() => expect(updateSession).toHaveBeenCalled());
    // Posts, comments and the member strip carry the old colour until they are refetched.
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(recorded.requests).toEqual([{ method: "PUT", url: "/api/v1/me/color", body: { color: "pink" } }]);
  });
});
