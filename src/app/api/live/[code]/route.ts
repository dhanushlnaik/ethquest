import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/server/admin";
import { currentParticipant, findSession, liveState } from "@/lib/server/live";

/** Polled ~1×/s by the big screen (?role=host, admins only) and by phones. */
export async function GET(req: Request, ctx: RouteContext<"/api/live/[code]">) {
  const { code } = await ctx.params;
  const session = await findSession(code);
  if (!session) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  const host = new URL(req.url).searchParams.get("role") === "host";
  if (host && !(await getAdmin())) return NextResponse.json({ error: "Host login required" }, { status: 401 });
  const participant = host ? null : await currentParticipant(session);
  const state = await liveState(session, { host, participantId: participant?.id });
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
