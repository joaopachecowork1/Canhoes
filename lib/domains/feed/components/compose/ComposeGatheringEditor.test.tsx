import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { feedRepo } from "@/lib/repositories/feedRepo";
import { ComposeGatheringEditor } from "./ComposeGatheringEditor";

describe("ComposeGatheringEditor", () => {
  it("renders inputs for title, location, description and candidate dates", () => {
    render(
      <ComposeGatheringEditor
        title=""
        onTitleChange={vi.fn()}
        location=""
        onLocationChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        dates={[""]}
        onDateChange={vi.fn()}
        onAddDate={vi.fn()}
        onRemoveDate={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText(/jantar de natal/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/pesquisar restaurante/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/notas/i)).toBeInTheDocument();
  });

  it("searches places with debounce and selects a place", async () => {
    const onLocationChange = vi.fn();
    const onSelectPlace = vi.fn();

    vi.spyOn(feedRepo, "searchPlaces").mockResolvedValueOnce([
      {
        id: "p1",
        name: "Cervejaria Ramiro",
        address: "Av. Almirante Reis 1, Lisboa",
        latitude: 38.72,
        longitude: -9.13,
        mapUrl: "https://maps.google.com/?cid=123",
      },
    ]);

    render(
      <ComposeGatheringEditor
        eventId="event-1"
        title="Jantar"
        onTitleChange={vi.fn()}
        location="Ramiro"
        onLocationChange={onLocationChange}
        onSelectPlace={onSelectPlace}
        description=""
        onDescriptionChange={vi.fn()}
        dates={[""]}
        onDateChange={vi.fn()}
        onAddDate={vi.fn()}
        onRemoveDate={vi.fn()}
      />,
    );

    // Aguarda o resultado do debounce
    await waitFor(() => {
      expect(screen.getByText("Cervejaria Ramiro")).toBeInTheDocument();
    });

    expect(screen.getByText("Av. Almirante Reis 1, Lisboa")).toBeInTheDocument();

    await userEvent.click(screen.getByText("Cervejaria Ramiro"));
    expect(onSelectPlace).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Cervejaria Ramiro",
        address: "Av. Almirante Reis 1, Lisboa",
      }),
    );
  });

  it("shows the selected location card and allows clearing it", async () => {
    const onSelectPlace = vi.fn();

    render(
      <ComposeGatheringEditor
        eventId="event-1"
        title="Jantar"
        onTitleChange={vi.fn()}
        location="Cervejaria Ramiro"
        locationAddress="Av. Almirante Reis 1, Lisboa"
        onLocationChange={vi.fn()}
        onSelectPlace={onSelectPlace}
        description=""
        onDescriptionChange={vi.fn()}
        dates={[""]}
        onDateChange={vi.fn()}
        onAddDate={vi.fn()}
        onRemoveDate={vi.fn()}
      />,
    );

    expect(screen.getByText("Cervejaria Ramiro")).toBeInTheDocument();
    expect(screen.getByText("Av. Almirante Reis 1, Lisboa")).toBeInTheDocument();

    const clearButton = screen.getByRole("button", { name: /alterar local/i });
    await userEvent.click(clearButton);
    expect(onSelectPlace).toHaveBeenCalledWith(null);
  });

  it("renders native date inputs for candidate dates and handles change, add and remove", async () => {
    const onDateChange = vi.fn();
    const onAddDate = vi.fn();
    const onRemoveDate = vi.fn();

    const { rerender } = render(
      <ComposeGatheringEditor
        title="Jantar"
        onTitleChange={vi.fn()}
        location=""
        onLocationChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        dates={["2026-11-20"]}
        onDateChange={onDateChange}
        onAddDate={onAddDate}
        onRemoveDate={onRemoveDate}
      />,
    );

    const dateInput = screen.getByLabelText(/data candidata 1/i);
    expect(dateInput).toHaveAttribute("type", "date");
    expect(dateInput).toHaveValue("2026-11-20");

    // Add candidate date button
    const addButton = screen.getByRole("button", { name: /adicionar data/i });
    await userEvent.click(addButton);
    expect(onAddDate).toHaveBeenCalledTimes(1);

    // Rerender with 2 dates to test remove button
    rerender(
      <ComposeGatheringEditor
        title="Jantar"
        onTitleChange={vi.fn()}
        location=""
        onLocationChange={vi.fn()}
        description=""
        onDescriptionChange={vi.fn()}
        dates={["2026-11-20", "2026-11-27"]}
        onDateChange={onDateChange}
        onAddDate={onAddDate}
        onRemoveDate={onRemoveDate}
      />,
    );

    const removeButtons = screen.getAllByRole("button", { name: /remover data/i });
    expect(removeButtons).toHaveLength(2);
    await userEvent.click(removeButtons[1]);
    expect(onRemoveDate).toHaveBeenCalledWith(1);
  });
});
