import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { refreshLivingCards } from "@/lib/server/living-cards";

// Daily Living-cards refresh. Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 300;

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  return !!secret && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await refreshLivingCards());
  } catch (err) {
    console.error("living cards refresh failed", err);
    return NextResponse.json({ error: "Refresh failed" }, { status: 502 });
  }
}
