"use server";

import { z } from "zod";
import QRCode from "qrcode";
import { requirePlayer } from "@/lib/server/session";
import { assertRateLimit } from "@/lib/server/rate-limit";
import { issueClaim } from "@/lib/server/rewards";
import { safeAction } from "@/lib/server/action";
import { track } from "@/lib/server/telemetry";
import { SITE_URL } from "@/lib/site";

export async function requestClaim(rewardSlug: string) {
  return safeAction(async () => {
    const slug = z.string().max(40).parse(rewardSlug);
    const player = await requirePlayer();
    await assertRateLimit(`claim:${player.id}`, 12, 300);
    const claim = await issueClaim(player.id, slug);
    const scanUrl = `${SITE_URL}/booth-admin/scan?t=${encodeURIComponent(claim.token)}`;
    const qrSvg = await QRCode.toString(scanUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2a1d12", light: "#fff8e8" } });
    await track("claim_issued", player.id, { reward: slug });
    return { qrSvg, shortCode: claim.shortCode, expiresAt: claim.expiresAt.toISOString(), reward: claim.reward };
  });
}
