/**
 * Erro que um route handler converte numa resposta JSON `{ code, message }` com `status`
 * (ver `apiRoute`). Os erros de domínio que o cliente pode tratar estendem-no, para que os
 * serviços não tenham de lidar com respostas.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Um 400 para input que a rota não aceita, com detalhes opcionais para o cliente. */
export function badRequest(message: string, details?: unknown) {
  return new HttpError(400, "VALIDATION_ERROR", message, details);
}

/** Um 401 para um pedido sem sessão. */
export function unauthorized() {
  return new HttpError(401, "UNAUTHORIZED", "Authentication required.");
}

/** Um 404 para um recurso que não existe neste evento (ou que o utilizador não pode ver). */
export function notFound(message: string) {
  return new HttpError(404, "NOT_FOUND", message);
}
