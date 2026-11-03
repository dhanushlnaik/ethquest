import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { createReward, updateReward } from "@/app/actions/admin";
import { ActionForm, Field, inputCls } from "@/components/admin/forms";
import { Panel, PixelLoader, RewardArt } from "@/components/pixel";

export const metadata = { title: "Rewards & inventory" };

export default function RewardsAdmin() {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Rewards &amp; inventory</h1>
      <p className="mb-4 text-sm text-muted">Stock changes are relative (+50 restock, −3 damaged) and can never push stock below zero.</p>
      <Suspense fallback={<PixelLoader />}>
        <Editor />
      </Suspense>
    </>
  );
}

async function Editor() {
  await requireAdminPage("ADMIN");
  const rewards = await db.reward.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { claims: { where: { status: "REDEEMED" } } } } } });
  return (
    <div className="space-y-4">
      {rewards.map((r) => (
        <Panel key={r.id} variant="raised" className="p-4">
          <div className="mb-3 flex items-center gap-3">
            <RewardArt name={r.icon} size={56} />
            <div>
              <p className="font-pixel text-xl">{r.name}</p>
              <p className="text-sm text-muted">Stock <b className="text-text">{r.stock}</b> / {r.initialStock} · redeemed {r._count.claims}</p>
            </div>
          </div>
          <ActionForm action={updateReward} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={r.id} />
            <Field label="Name"><input name="name" defaultValue={r.name} className={inputCls} /></Field>
            <Field label="XP required"><input name="xpRequired" type="number" defaultValue={r.xpRequired} className={inputCls} /></Field>
            <Field label="Description"><input name="description" defaultValue={r.description} className={inputCls} /></Field>
            <Field label="Stock change" hint="e.g. 50 to restock, -2 to remove"><input name="stockDelta" type="number" defaultValue={0} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={r.isActive} /> Active</label>
          </ActionForm>
        </Panel>
      ))}
      <Panel tone="gold" className="p-4">
        <p className="font-pixel mb-3 text-xl">Add a reward</p>
        <ActionForm action={createReward} submit="Create" className="grid gap-3 sm:grid-cols-2">
          <Field label="Slug"><input name="slug" required pattern="[a-z0-9-]+" className={inputCls} /></Field>
          <Field label="Name"><input name="name" required className={inputCls} /></Field>
          <Field label="Description"><input name="description" className={inputCls} /></Field>
          <Field label="Art">
            <select name="icon" className={inputCls}>{["sticker-pack", "tshirt", "nft-card", "pin", "medal", "trophy", "loot-box"].map((i) => <option key={i}>{i}</option>)}</select>
          </Field>
          <Field label="XP required"><input name="xpRequired" type="number" required className={inputCls} /></Field>
          <Field label="Initial stock"><input name="stock" type="number" required className={inputCls} /></Field>
        </ActionForm>
      </Panel>
    </div>
  );
}
