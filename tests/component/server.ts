import { setupServer } from "msw/node";

/**
 * The fake API for component and hook tests. Each test adds the handlers it needs with
 * `server.use(...)`; any request without a handler fails the test (see setup.ts).
 */
export const server = setupServer();
