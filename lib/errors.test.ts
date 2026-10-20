import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/canhoesClient";

import { getErrorMessage } from "./errors";

/*
 * Equivalence classes of the input: an ApiError (with a known code, a caller message for its
 * status, a default status message, or none of those), a plain Error, and anything else.
 */
describe("getErrorMessage", () => {
  describe("ApiError", () => {
    it("prefers the message for a known error code", () => {
      const error = new ApiError("x", 429, { code: "RATE_LIMIT_EXCEEDED" });
      expect(getErrorMessage(error, "Falhou.")).toBe("Demasiados pedidos seguidos. Espera um pouco e tenta outra vez. x");
    });

    it("uses the caller's message for the status before the default one", () => {
      const error = new ApiError("Request failed", 400);
      expect(getErrorMessage(error, "Falhou.", { 400: "Nome inválido." })).toBe("Nome inválido.");
    });

    it("falls back to the default message for the status", () => {
      expect(getErrorMessage(new ApiError("Request failed", 404), "Falhou.")).toBe("O recurso pedido já não existe.");
    });

    it("falls back to the caller's text for an unknown status", () => {
      expect(getErrorMessage(new ApiError("Request failed", 418), "Falhou.")).toBe("Falhou.");
    });

    it("appends the server's detail, with a colon when the base has no full stop", () => {
      const error = new ApiError("Request failed", 418, { message: "Chaleira cheia" });
      expect(getErrorMessage(error, "Falhou")).toBe("Falhou: Chaleira cheia");
    });

    it("reads detail, title and error fields, and plain-string details", () => {
      expect(getErrorMessage(new ApiError("x", 418, { detail: "d" }), "F.")).toBe("F. d");
      expect(getErrorMessage(new ApiError("x", 418, { title: "t" }), "F.")).toBe("F. t");
      expect(getErrorMessage(new ApiError("x", 418, "  texto  "), "F.")).toBe("F. texto");
    });

    it("does not repeat a detail equal to the base message", () => {
      expect(getErrorMessage(new ApiError("Falhou.", 418), "Falhou.")).toBe("Falhou.");
    });
  });

  it("hints at the connection for a failed fetch", () => {
    expect(getErrorMessage(new TypeError("Failed to fetch"), "Não deu.")).toBe("Não deu. Verifica a ligação ao servidor.");
  });

  it("shows a plain error's message, or the fallback when it is blank", () => {
    expect(getErrorMessage(new Error("Algo partiu"), "F")).toBe("Algo partiu");
    expect(getErrorMessage(new Error("   "), "F")).toBe("F");
  });

  it("uses the fallback for anything that is not an Error", () => {
    expect(getErrorMessage("ups", "F")).toBe("F");
    expect(getErrorMessage(undefined)).toBe("Algo correu mal. Tenta outra vez.");
  });
});
