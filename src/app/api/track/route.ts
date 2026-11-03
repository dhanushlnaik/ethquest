import { z } from "zod";
import { getPlayer } from "@/lib/server/session";
import { track } from "@/lib/server/telemetry";
import { rateLimit } from "@/lib/server/rate-limit";

const schema = z.object({ url: z.string().url().max(500), path: z.string().max(200).optional() });

/** Product-click beacon (navigator.sendBeacon). Records the destination host+path only. */
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) return new Response(null, { status: 204 });
  const player = await getPlayer();
  if (!(await rateLimit(`track:${player?.id ?? "anon"}`, 120, 60))) return new Response(null, { status: 204 });
  const u = new URL(body.data.url);
  await track("product_click", player?.id ?? null, { host: u.host, path: u.pathname, from: body.data.path });
  return new Response(null, { status: 204 });
}
