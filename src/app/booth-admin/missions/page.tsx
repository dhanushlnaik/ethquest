import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { saveMission } from "@/app/actions/admin";
import { ActionForm, Field, inputCls } from "@/components/admin/forms";
import { PixelLoader, Tag } from "@/components/pixel";

export const metadata = { title: "Missions" };

export default function MissionsAdmin() {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Missions</h1>
      <p className="mb-4 text-sm text-muted">Completion XP is awarded once per mission per difficulty. Per-answer XP is capped daily (see Settings).</p>
      <Suspense fallback={<PixelLoader />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireAdminPage("ADMIN");
  const missions = await db.mission.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { attempts: { where: { status: "COMPLETED" } } } } } });
  return (
    <div className="space-y-3">
      {missions.map((m) => (
        <details key={m.id} className="px-panel px-panel--raised p-3">
          <summary className="flex cursor-pointer flex-wrap items-center gap-2">
            <span className="font-pixel text-lg">{m.title}</span>
            <Tag>{m.world}</Tag>
            {!m.isActive && <Tag tone="red">inactive</Tag>}
            <span className="text-sm text-muted">+{m.xpComplete} XP · {m._count.attempts} completions</span>
          </summary>
          <ActionForm action={saveMission} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={m.id} />
            <Field label="Title"><input name="title" defaultValue={m.title} className={inputCls} /></Field>
            <Field label="Blurb"><input name="blurb" defaultValue={m.blurb} className={inputCls} /></Field>
            <Field label="Completion XP"><input name="xpComplete" type="number" defaultValue={m.xpComplete} className={inputCls} /></Field>
            <Field label="XP per correct item (match/order)"><input name="xpPerCorrect" type="number" defaultValue={m.xpPerCorrect} className={inputCls} /></Field>
            <Field label="Config (JSON)" hint='e.g. {"questions":5,"timerSeconds":30}'><textarea name="config" defaultValue={JSON.stringify(m.config)} rows={2} className={`${inputCls} font-mono text-xs`} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={m.isActive} /> Active</label>
          </ActionForm>
        </details>
      ))}
    </div>
  );
}
