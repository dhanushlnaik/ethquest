import { Suspense } from "react";
import Link from "next/link";
import { db } from "@/lib/server/db";
import { requireAdminPage } from "@/lib/server/admin";
import { saveQuestion, toggleQuestion } from "@/app/actions/admin";
import { ActionButton, ActionForm, Field, inputCls } from "@/components/admin/forms";
import { Panel, PixelLoader, Tag } from "@/components/pixel";

export const metadata = { title: "Questions" };

export default function QuestionsAdmin({ searchParams }: PageProps<"/booth-admin/questions">) {
  return (
    <>
      <h1 className="font-pixel mb-1 text-3xl">Question bank</h1>
      <p className="mb-4 text-sm text-muted">Edits are marked &ldquo;edited by admin&rdquo; and are never overwritten by re-seeding. Every question needs a source URL.</p>
      <Suspense fallback={<PixelLoader />}>
        <Bank searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const KINDS = ["trivia", "spot-fake", "match"] as const;
const DIFFS = ["EXPLORER", "BUILDER", "NERD"] as const;

async function Bank({ searchParams }: { searchParams: PageProps<"/booth-admin/questions">["searchParams"] }) {
  await requireAdminPage("ADMIN");
  const sp = await searchParams;
  const kind = KINDS.includes(sp.kind as never) ? (sp.kind as (typeof KINDS)[number]) : "trivia";
  const difficulty = DIFFS.includes(sp.d as never) ? (sp.d as (typeof DIFFS)[number]) : undefined;
  const editId = typeof sp.edit === "string" ? sp.edit : undefined;
  const questions = await db.quizQuestion.findMany({ where: { kind, ...(difficulty ? { difficulty } : {}) }, orderBy: [{ difficulty: "asc" }, { slug: "asc" }] });
  const editing = editId === "new" ? null : questions.find((q) => q.id === editId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => <Link key={k} href={`?kind=${k}`} className={`font-pixel px-3 py-1 ${k === kind ? "bg-purple text-white" : "bg-raised"}`}>{k}</Link>)}
        <span className="w-4" />
        {DIFFS.map((d) => <Link key={d} href={`?kind=${kind}&d=${d}`} className={`font-pixel px-3 py-1 text-sm ${d === difficulty ? "bg-blue-lo" : "bg-raised"}`}>{d}</Link>)}
        <Link href={`?kind=${kind}&edit=new`} className="px-btn px-btn--gold px-btn--sm ml-auto">+ New question</Link>
      </div>
      {(editId === "new" || editing) && (
        <Panel tone="gold" className="p-4">
          <ActionForm action={saveQuestion} className="grid gap-3">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Kind"><select name="kind" defaultValue={editing?.kind ?? kind} className={inputCls}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select></Field>
              <Field label="Difficulty"><select name="difficulty" defaultValue={editing?.difficulty ?? "EXPLORER"} className={inputCls}>{DIFFS.map((d) => <option key={d}>{d}</option>)}</select></Field>
              <Field label="Topic"><input name="topic" defaultValue={editing?.topic ?? ""} required className={inputCls} /></Field>
            </div>
            <Field label="Prompt"><textarea name="prompt" defaultValue={editing?.prompt ?? ""} required rows={2} className={inputCls} /></Field>
            <Field label="Options (JSON)" hint='trivia: [{"id":"a","label":"Blobs","correct":true},…] · spot-fake: [{"id":"a","label":"EIP-1559","text":"…","fake":false},…] · match: [{"id":"p0","left":"EIP-1559","right":"Fee burn"},…]'>
              <textarea name="options" defaultValue={editing ? JSON.stringify(editing.options, null, 1) : "[]"} required rows={6} className={`${inputCls} font-mono text-xs`} />
            </Field>
            <Field label="Hint"><input name="hint" defaultValue={editing?.hint ?? ""} className={inputCls} /></Field>
            <Field label="Explanation"><textarea name="explanation" defaultValue={editing?.explanation ?? ""} required rows={3} className={inputCls} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Learn more URL (EIPsInsight)"><input name="learnMoreUrl" type="url" defaultValue={editing?.learnMoreUrl ?? "https://eipsinsight.com/"} required className={inputCls} /></Field>
              <Field label="Source URL (for verification)"><input name="sourceUrl" type="url" defaultValue={editing?.sourceUrl ?? "https://eips.ethereum.org/"} required className={inputCls} /></Field>
            </div>
          </ActionForm>
        </Panel>
      )}
      <ul className="space-y-2">
        {questions.map((q) => (
          <li key={q.id}>
            <Panel variant="raised" className="flex flex-wrap items-center gap-3 p-3">
              <Tag tone={q.difficulty === "EXPLORER" ? "green" : q.difficulty === "BUILDER" ? "blue" : "purple"}>{q.difficulty}</Tag>
              {!q.isActive && <Tag tone="red">inactive</Tag>}
              {q.editedByAdmin && <Tag tone="gold">edited</Tag>}
              <p className="min-w-0 flex-1 text-sm">{q.prompt}</p>
              <Link href={`?kind=${kind}${difficulty ? `&d=${difficulty}` : ""}&edit=${q.id}`} className="font-arcade text-xs text-blue underline">EDIT</Link>
              <ActionButton label={q.isActive ? "Deactivate" : "Activate"} run={toggleQuestion.bind(null, q.id, !q.isActive)} />
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  );
}
