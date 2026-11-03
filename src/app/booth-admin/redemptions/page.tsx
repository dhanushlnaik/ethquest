import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { voidClaim } from "@/app/actions/admin";
import { ActionButton } from "@/components/admin/forms";
import { Panel, PixelLoader, Tag } from "@/components/pixel";

export const metadata = { title: "Redemptions" };

export default function RedemptionsPage() {
  return (
    <>
      <h1 className="font-pixel mb-4 text-3xl">Redemptions</h1>
      <Suspense fallback={<PixelLoader />}>
        <Claims />
      </Suspense>
    </>
  );
}

async function Claims() {
  const admin = await requireAdminPage();
  const claims = await db.rewardClaim.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { reward: true, player: { select: { nickname: true } } } });
  const staff = new Map((await db.adminUser.findMany({ select: { id: true, name: true } })).map((a) => [a.id, a.name]));
  return (
    <Panel variant="sunken" className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="font-arcade text-xs text-muted">
          <tr><th className="p-3">Player</th><th>Reward</th><th>Status</th><th>Code</th><th>When</th><th>By</th><th /></tr>
        </thead>
        <tbody>
          {claims.map((c) => {
            const expired = c.status === "ISSUED" && c.expiresAt < new Date();
            return (
              <tr key={c.id} className="border-t-2 border-line">
                <td className="p-3">{c.player.nickname}</td>
                <td>{c.reward.name}</td>
                <td><Tag tone={c.status === "REDEEMED" ? "green" : c.status === "VOID" || expired ? "red" : "gold"}>{expired ? "EXPIRED" : c.status}</Tag></td>
                <td className="font-arcade text-xs">{c.shortCode}</td>
                <td className="text-muted">{(c.redeemedAt ?? c.createdAt).toLocaleString()}</td>
                <td className="text-muted">{c.redeemedBy ? staff.get(c.redeemedBy) ?? "?" : ""}</td>
                <td>{c.status === "ISSUED" && admin.role !== "VOLUNTEER" && <ActionButton label="Void" confirm="Void this unredeemed claim?" run={voidClaim.bind(null, c.id)} />}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {claims.length === 0 && <p className="p-4 text-muted">No claims yet.</p>}
    </Panel>
  );
}
