import { Suspense } from "react";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { saveStep } from "@/app/actions/admin";
import { ActionForm, Field, inputCls } from "@/components/admin/forms";
import { Panel, PixelLoader, Tag } from "@/components/pixel";

export const metadata = { title: "Pathways" };

export default function PathwaysAdmin() {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Pathfinder pathways</h1>
      <p className="mb-4 text-sm text-muted">Steps with role/goal targeting override the default step for that stage. Only link to real, verified resources. Never invent openings or opportunities.</p>
      <Suspense fallback={<PixelLoader />}>
        <List />
      </Suspense>
    </>
  );
}

async function List() {
  await requireAdminPage("ADMIN");
  const [pathways, counts] = await Promise.all([
    db.pathway.findMany({ orderBy: { code: "asc" }, include: { steps: { orderBy: { sortOrder: "asc" } } } }),
    db.playerPathway.groupBy({ by: ["pathwayId"], _count: true }),
  ]);
  const used = new Map(counts.map((c) => [c.pathwayId, c._count]));
  return (
    <div className="space-y-6">
      {pathways.map((p) => (
        <Panel key={p.id} variant="raised" className="p-4">
          <p className="font-pixel text-2xl">{p.code} · {p.title} <span className="text-sm text-muted">({used.get(p.id) ?? 0} players)</span></p>
          <p className="text-sm text-muted">{p.summary}</p>
          <div className="mt-3 space-y-2">
            {p.steps.map((s) => (
              <details key={s.id} className="bg-sunken p-3">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <Tag tone="gold">{s.stage}</Tag>
                  <span className="font-pixel">{s.title}</span>
                  {s.roles.length > 0 && <Tag tone="purple">roles: {s.roles.join(", ")}</Tag>}
                  {s.goals.length > 0 && <Tag tone="blue">goals: {s.goals.join(", ")}</Tag>}
                </summary>
                <ActionForm action={saveStep} className="mt-3 grid gap-3">
                  <input type="hidden" name="id" value={s.id} />
                  <Field label="Title"><input name="title" defaultValue={s.title} className={inputCls} /></Field>
                  <Field label="Action"><textarea name="action" defaultValue={s.action} rows={2} className={inputCls} /></Field>
                  <Field label="Resources (JSON)" hint='[{"label":"…","url":"https://…"}]'><textarea name="resources" defaultValue={JSON.stringify(s.resources)} rows={3} className={`${inputCls} font-mono text-xs`} /></Field>
                </ActionForm>
              </details>
            ))}
          </div>
        </Panel>
      ))}
    </div>
  );
}
