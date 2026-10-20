import { describe, expect, it, vi } from "vitest";
import { act, renderHook, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";

import { apiRoute, recordRequests } from "@/tests/component/api";
import { adminBootstrap } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { CANHOES_MODULES } from "@/lib/modules";

import { useAdminControlCenter } from "./useAdminControlCenter";

const state = adminBootstrap().state;
const ADMIN = "events/event-1/admin";

function setup({ eventId = "event-1" as string | null } = {}) {
  const onRefresh = vi.fn(async () => undefined);
  const hook = renderHook(() => useAdminControlCenter(eventId, state, onRefresh));
  return { onRefresh, ...hook };
}

describe("useAdminControlCenter", () => {
  it("changes the phase, refreshes, and ignores the phase that is already active", async () => {
    const recorder = recordRequests();
    server.use(
      http.put(`*/api/v1/${ADMIN}/phase`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json({});
      }),
    );
    const { result, onRefresh } = setup();

    act(() => result.current.handleUpdatePhase("PROPOSALS"));
    expect(recorder.requests).toEqual([]);

    act(() => result.current.handleUpdatePhase("VOTING"));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
    expect(recorder.requests).toEqual([
      { method: "PUT", url: `/api/v1/${ADMIN}/phase`, body: { phaseType: "VOTING" } },
    ]);
  });

  it("switches proposals and modules on and off", async () => {
    const recorder = recordRequests();
    server.use(
      http.put(`*/api/v1/${ADMIN}/state`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json({});
      }),
      http.patch("*/api/v1/events/event-1/modules", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json({});
      }),
    );
    const { result, onRefresh } = setup();
    const firstModule = CANHOES_MODULES[0]!;

    act(() => result.current.handleProposalsOpen(false));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    act(() => result.current.handleModuleToggle(firstModule, false));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(2));

    expect(recorder.requests.map((request) => request.body)).toEqual([
      { nominationsVisible: false },
      { modules: { [firstModule.key]: false } },
    ]);
  });

  it("activates another event only when it differs from the current one", async () => {
    server.use(apiRoute("put", "events/event-2/admin/activate", {}));
    const { result, onRefresh } = setup();

    act(() => result.current.handleActivateEvent("event-1"));
    act(() => result.current.handleActivateEvent(""));
    act(() => result.current.handleActivateEvent("event-2"));

    await waitFor(() => expect(onRefresh).toHaveBeenCalledOnce());
  });

  it("does nothing without an event, and reports a failed save without refreshing", async () => {
    const withoutEvent = setup({ eventId: null });
    act(() => withoutEvent.result.current.handleUpdatePhase("VOTING"));
    act(() => withoutEvent.result.current.handleProposalsOpen(true));
    expect(withoutEvent.onRefresh).not.toHaveBeenCalled();

    server.use(apiRoute("put", `${ADMIN}/state`, { message: "boom" }, 500));
    const failing = setup();
    renderWithProviders(<div />);
    act(() => failing.result.current.handleProposalsOpen(true));

    await waitFor(() => expect(failing.result.current.savingKey).toBeNull());
    expect(failing.onRefresh).not.toHaveBeenCalled();
    expect((await screen.findAllByText(/boom/)).length).toBeGreaterThan(0);
  });
});
