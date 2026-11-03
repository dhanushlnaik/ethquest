import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { saveXPConfig, setStaffActive } from "@/app/actions/admin";
import { getXPConfig } from "@/lib/server/progression";
import { ActionButton, ActionForm, Field, inputCls } from "@/components/admin/forms";
import { StaffCreate } from "@/components/admin/staff-create";
import { Panel, PixelLoader, Tag } from "@/components/pixel";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <Suspense fallback={<PixelLoader />}>
      <Settings />
    </Suspense>
  );
}

async function Settings() {
  const me = await requireAdminPage("OWNER");
  const [xp, staff] = await Promise.all([getXPConfig(), db.adminUser.findMany({ orderBy: { createdAt: "asc" } })]);
  return (
    <div className="space-y-6">
      <h1 className="font-pixel text-3xl">Settings</h1>
      <Panel variant="raised" className="p-4">
        <p className="font-pixel text-xl">XP engine</p>
        <p className="mb-3 text-sm text-muted">One-time side-quest XP amounts. Ranked games always count only each player&apos;s best run.</p>
        <ActionForm action={saveXPConfig}>
          <Field label="XP config (JSON)"><textarea name="xp" defaultValue={JSON.stringify(xp, null, 2)} rows={16} className={`${inputCls} font-mono text-xs`} /></Field>
        </ActionForm>
      </Panel>
      <Panel variant="raised" className="p-4">
        <p className="font-pixel text-xl">Staff accounts</p>
        <ul className="mt-3 space-y-2">
          {staff.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1">{s.name} · {s.email}</span>
              <Tag tone={s.role === "OWNER" ? "gold" : s.role === "ADMIN" ? "purple" : "blue"}>{s.role}</Tag>
              {!s.isActive && <Tag tone="red">inactive</Tag>}
              {s.id !== me.id && <ActionButton label={s.isActive ? "Deactivate" : "Activate"} run={setStaffActive.bind(null, s.id, !s.isActive)} />}
            </li>
          ))}
        </ul>
        <div className="mt-4"><StaffCreate /></div>
      </Panel>
      <Panel variant="raised" className="p-4">
        <p className="font-pixel text-xl">Booth links</p>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Player QR (print this): <code className="text-gold">{SITE_URL}/play</code></li>
          <li>Kiosk leaderboard: <code className="text-gold">{SITE_URL}/kiosk/leaderboard?token=…</code> (token is KIOSK_TOKEN in the server env)</li>
          <li>Live quiz host: <code className="text-gold">{SITE_URL}/live/host</code></li>
        </ul>
      </Panel>
    </div>
  );
}
