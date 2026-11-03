import "server-only";
import { ZodError } from "zod";
import { PlayerRequiredError } from "./session";
import { RateLimitError } from "./rate-limit";
import type { ActionError } from "@/lib/games/types";

/** Errors whose message is safe and friendly enough to show players. */
export class UserError extends Error {}

export type ActionResult<T> = { ok: true; data: T } | ({ ok: false } & ActionError);

/** Wraps a server action so the client always gets a typed result instead of an opaque throw. */
export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof PlayerRequiredError) return { ok: false, error: "Start a game session first.", code: "NO_PLAYER" };
    if (err instanceof RateLimitError) return { ok: false, error: err.message, code: "RATE_LIMIT" };
    if (err instanceof ZodError) return { ok: false, error: "That didn't look right. Please try again.", code: "INVALID" };
    // Next.js control-flow errors (redirect/notFound) must propagate.
    if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err;
    console.error(err);
    const message = err instanceof UserError ? err.message : "Something went wrong. Please try again.";
    return { ok: false, error: message, code: "UNAVAILABLE" };
  }
}
