import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";

import { normalizeUploadImage } from "@/lib/uploadImage";

import { useComposer } from "./useComposer";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
// Comprimir uma imagem precisa de um canvas a sério; aqui devolve o ficheiro tal como veio, salvo quando o teste diz o contrário.
vi.mock("@/lib/uploadImage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/uploadImage")>()),
  normalizeUploadImage: vi.fn(async (file: File) => file),
}));

function fileList(files: File[]): FileList {
  const list = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: () => files.values(),
  };
  return Object.assign(list, files);
}

const png = (name: string, size = 4) => {
  const file = new File([new Uint8Array(4)], name, { type: "image/png" });
  // Um ficheiro grande sem alocar os bytes: só o tamanho que o hook lê.
  Object.defineProperty(file, "size", { value: size });
  return file;
};

beforeEach(() => {
  // O jsdom não cria URLs de pré-visualização; guarda-se o que se criou e libertou.
  URL.createObjectURL = vi.fn((file: Blob) => `blob:${(file as File).name}`);
  URL.revokeObjectURL = vi.fn();
  vi.mocked(toast.error).mockClear();
  vi.mocked(toast.success).mockClear();
});

afterEach(() => {
  vi.mocked(normalizeUploadImage).mockImplementation(async (file) => file);
});

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

  it("lets the options of a poll be edited and turned on and off", () => {
    const { result } = renderHook(() => useComposer());

    act(() => {
      result.current.poll.setIsEnabled(true);
      result.current.poll.setQuestion("Onde?");
      result.current.poll.changeOption(1, "Porto");
    });

    expect(result.current.poll).toMatchObject({ isEnabled: true, question: "Onde?", options: ["", "Porto"] });
  });
});

describe("the images of a post", () => {
  it("adds an image with a preview, and skips the same image picked twice", async () => {
    const { result } = renderHook(() => useComposer());

    const photo = png("a.png");

    await act(() => result.current.addFiles(fileList([photo, photo])));
    await act(() => result.current.addFiles(fileList([photo])));

    expect(result.current.files.map(({ name }) => name)).toEqual(["a.png"]);
    expect(result.current.previewUrls).toEqual(["blob:a.png"]);
  });

  it("refuses an image over the size limit and says which one", async () => {
    const { result } = renderHook(() => useComposer());

    await act(() => result.current.addFiles(fileList([png("enorme.png", 11 * 1024 * 1024)])));

    expect(result.current.files).toHaveLength(0);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("enorme.png"));
  });

  it("stops at four images and says so", async () => {
    const { result } = renderHook(() => useComposer());

    await act(() => result.current.addFiles(fileList(["1", "2", "3", "4", "5"].map((n) => png(`${n}.png`)))));

    expect(result.current.files).toHaveLength(4);
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("4"));
  });

  it("tells how many photos were shrunk before sending", async () => {
    vi.mocked(normalizeUploadImage).mockImplementation(async (file) => new File(["x"], file.name, { type: file.type }));
    const { result } = renderHook(() => useComposer());

    await act(() => result.current.addFiles(fileList([png("a.png", 5000), png("b.png", 5000)])));

    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("2"));
  });

  it("does nothing when no files were chosen", async () => {
    const { result } = renderHook(() => useComposer());

    await act(() => result.current.addFiles(null));

    expect(result.current.files).toHaveLength(0);
  });

  it("removes an image and frees its preview, and moves images up and down", async () => {
    const { result } = renderHook(() => useComposer());
    await act(() => result.current.addFiles(fileList([png("a.png"), png("b.png"), png("c.png")])));

    act(() => result.current.moveFile(0, 1));
    expect(result.current.files.map(({ name }) => name)).toEqual(["b.png", "a.png", "c.png"]);

    act(() => result.current.removeFile(0));
    expect(result.current.files.map(({ name }) => name)).toEqual(["a.png", "c.png"]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:b.png");
  });

  it("frees every preview when the post is reset and when the composer goes away", async () => {
    const { result, unmount } = renderHook(() => useComposer());
    await act(() => result.current.addFiles(fileList([png("a.png"), png("b.png")])));

    act(() => result.current.reset());
    expect(result.current.files).toHaveLength(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);

    await act(() => result.current.addFiles(fileList([png("c.png")])));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenLastCalledWith("blob:c.png");
  });
});

describe("the gathering of a post", () => {
  it("fills the place from a suggestion and clears it when the suggestion goes away", () => {
    const { result } = renderHook(() => useComposer());

    act(() =>
      result.current.gathering.selectPlace({
        name: "Taberna",
        address: "Rua A",
        latitude: 38.7,
        longitude: -9.1,
        mapUrl: "https://maps.example.test",
        id: "p1",
      }),
    );
    expect(result.current.gathering).toMatchObject({
      location: "Taberna",
      locationAddress: "Rua A",
      latitude: 38.7,
      longitude: -9.1,
      mapUrl: "https://maps.example.test",
      placeId: "p1",
    });

    act(() => result.current.gathering.selectPlace(null));
    expect(result.current.gathering).toMatchObject({
      location: "Taberna",
      locationAddress: "",
      latitude: null,
      longitude: null,
      mapUrl: null,
      placeId: null,
    });
  });

  it("keeps between one and ten dates", () => {
    const { result } = renderHook(() => useComposer());

    act(() => {
      for (let index = 0; index < 12; index++) result.current.gathering.addDate();
    });
    expect(result.current.gathering.dates).toHaveLength(10);

    act(() => result.current.gathering.changeDate(0, "Sexta"));
    expect(result.current.gathering.dates[0]).toBe("Sexta");

    act(() => result.current.gathering.removeDate(0));
    expect(result.current.gathering.dates).toHaveLength(9);
  });

  it("leaves one empty date when the last one is removed", () => {
    const { result } = renderHook(() => useComposer());
    act(() => result.current.gathering.changeDate(0, "Sexta"));

    act(() => result.current.gathering.removeDate(0));

    expect(result.current.gathering.dates).toEqual([""]);
  });

  it("goes back to an empty draft when the post is reset", () => {
    const { result } = renderHook(() => useComposer());
    act(() => {
      result.current.setText("Olá");
      result.current.gathering.setIsEnabled(true);
      result.current.gathering.setTitle("Jantar");
      result.current.gathering.setDescription("Notas");
      result.current.gathering.setLocation("Taberna");
      result.current.gathering.setLocationAddress("Rua A");
    });

    act(() => result.current.reset());

    expect(result.current.text).toBe("");
    expect(result.current.gathering).toMatchObject({
      isEnabled: false,
      title: "",
      description: "",
      location: "",
      locationAddress: "",
      dates: [""],
    });
  });
});
