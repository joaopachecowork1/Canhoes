import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";

import { useComposer } from "./useComposer";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function fileList(files: File[]): FileList {
  const list = { length: files.length, item: (index: number) => files[index] ?? null, [Symbol.iterator]: () => files.values() };
  return Object.assign(list, files);
}

describe("useComposer", () => {
  it("refuses files that are not images", async () => {
    const { result } = renderHook(() => useComposer());
    await act(() => result.current.addFiles(fileList([new File(["x"], "notas.txt", { type: "text/plain" })])));

    expect(result.current.files).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("notas.txt"));
  });

  it("keeps poll options between two and six", () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.poll.removeOption(0));
    expect(result.current.poll.options).toHaveLength(2);

    act(() => {
      for (let index = 0; index < 10; index++) result.current.poll.addOption();
    });
    expect(result.current.poll.options).toHaveLength(6);
  });
});
