import { describe, expect, it } from "vitest";

import { POST as register } from "@/app/api/auth/register/route";
import { POST as logTelemetry } from "@/app/api/telemetry/log/route";
import { POST as uploadFeedImages } from "@/app/api/v1/events/[eventId]/feed/uploads/route";
import { POST as createComment } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/route";
import { POST as createPost } from "@/app/api/v1/events/[eventId]/feed/posts/route";
import { POST as uploadNomineeImage } from "@/app/api/v1/events/[eventId]/nominations/[nomineeId]/upload/route";
import { POST as uploadWishlistImage } from "@/app/api/v1/events/[eventId]/wishlist/[itemId]/image/route";

import { callRoute, createEvent, createMember, signInAs } from "./helpers";

type Handler<Params> = Parameters<typeof callRoute<Params>>[0];

/** Calls a route `calls` times from the given IP and returns the status of the last call. */
async function hammer<Params>(handler: Handler<Params>, params: Params, ip: string, calls: number) {
  let status = 0;
  for (let call = 0; call < calls; call++) {
    status = (await callRoute(handler, params, { method: "POST", body: {}, ip })).status;
  }
  return status;
}

/** One case: `allowed` calls pass the limit, the next one is refused (one IP per case: limits are per IP). */
function itLimits<Params>(name: string, handler: Handler<Params>, params: Params, allowed: number) {
  it(`answers 429 after too many requests when ${name}`, async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id, "Ana"));
    const ip = `203.0.113.${name.length}`;

    expect(await hammer(handler, params, ip, allowed)).not.toBe(429);
    expect(await hammer(handler, params, ip, 1)).toBe(429);
  });
}

describe("rate limits on public and heavy writes", () => {
  itLimits("registering", register, {}, 5);
  itLimits("uploading feed images", uploadFeedImages, { eventId: "e" }, 5);
  itLimits("uploading a nominee image", uploadNomineeImage, { eventId: "e", nomineeId: "n" }, 5);
  itLimits("uploading a wishlist image", uploadWishlistImage, { eventId: "e", itemId: "i" }, 5);
  itLimits("sending browser telemetry", logTelemetry, {}, 20);
  itLimits("posting", createPost, { eventId: "e" }, 20);
  itLimits("commenting", createComment, { eventId: "e", postId: "p" }, 20);
});
