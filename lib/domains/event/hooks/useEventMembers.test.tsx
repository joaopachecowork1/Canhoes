import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";

import { member } from "@/tests/component/fixtures";
import { server } from "@/tests/component/server";

import { useEventMembers } from "./useEventMembers";

describe("useEventMembers", () => {
  it("asks the API once for several readers of the same event", async () => {
    let requests = 0;
    server.use(
      http.get("*/api/v1/events/event-1/members", () => {
        requests += 1;
        return HttpResponse.json([member()]);
      })
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    const first = renderHook(() => useEventMembers("event-1"), { wrapper });
    const second = renderHook(() => useEventMembers("event-1"), { wrapper });

    await waitFor(() => expect(second.result.current.data).toHaveLength(1));
    expect(first.result.current.data).toHaveLength(1);
    expect(requests).toBe(1);
  });
});
