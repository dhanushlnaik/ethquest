import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { saveUpgrade } from "@/app/actions/admin";
import { ActionForm, Field, inputCls } from "@/components/admin/forms";
import { Panel, PixelLoader, Tag } from "@/components/pixel";

export const metadata = { title: "Upgrades" };

export default function UpgradesAdmin() {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Upgrade timeline data</h1>
      <p className="mb-4 text-sm text-muted">
        Only <b>LIVE</b> upgrades (with a verified activation date) appear as facts in the timeline games. Scheduled / in-development / planned / speculative upgrades only appear in &ldquo;What Comes Next?&rdquo;, clearly labelled as predictions.
      </p>
      <Suspense fallback={<PixelLoader />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireAdminPage("ADMIN");
  const upgrades = await db.upgrade.findMany({ orderBy: [{ activatedAt: { sort: "asc", nulls: "last" } }], include: { eips: true } });
  return (
    <div className="space-y-3">
      {upgrades.map((u) => (
        <details key={u.id} className="px-panel px-panel--raised p-3">
          <summary className="flex cursor-pointer flex-wrap items-center gap-2">
            <span className="font-pixel text-lg">{u.name}</span>
            <Tag tone={u.status === "LIVE" ? "green" : "gold"}>{u.status}</Tag>
            <span className="text-sm text-muted">{u.activatedAt ? u.activatedAt.toISOString().slice(0, 10) : "no date"}</span>
            {u.editedByAdmin && <Tag tone="gold">edited</Tag>}
            <span className="text-xs text-faint">{u.eips.length} EIPs</span>
          </summary>
          <ActionForm action={saveUpgrade} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={u.id} />
            <Field label="Name"><input name="name" defaultValue={u.name} className={inputCls} /></Field>
            <Field label="Status">
              <select name="status" defaultValue={u.status} className={inputCls}>{["LIVE", "SCHEDULED", "IN_DEVELOPMENT", "PLANNED", "SPECULATIVE"].map((s) => <option key={s}>{s}</option>)}</select>
            </Field>
            <Field label="Mainnet activation date" hint="Only for LIVE upgrades. Verify on ethereum.org / EIPsInsight first.">
              <input name="activatedAt" type="date" defaultValue={u.activatedAt?.toISOString().slice(0, 10) ?? ""} className={inputCls} />
            </Field>
            <Field label="EIPsInsight URL"><input name="eipsinsightUrl" type="url" defaultValue={u.eipsinsightUrl} className={inputCls} /></Field>
            <Field label="One-liner"><input name="oneLiner" defaultValue={u.oneLiner} className={inputCls} /></Field>
            <Field label="Major changes (one per line)"><textarea name="majorChanges" defaultValue={u.majorChanges.join("\n")} rows={4} className={inputCls} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="inHistoryGames" defaultChecked={u.inHistoryGames} /> Use in history games</label>
          </ActionForm>
        </details>
      ))}
    </div>
  );
}
