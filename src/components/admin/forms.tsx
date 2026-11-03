"use client";

import { useActionState, useTransition, useState, type ReactNode } from "react";
import { Button, cx } from "../pixel";

type R<T = unknown> = { ok: true; data: T } | { ok: false; error: string } | null;

/** A form bound to an admin server action with inline success/error feedback. */
export function ActionForm<T>({ action, children, submit = "Save", className, onDone }: { action: (prev: R<T>, fd: FormData) => Promise<R<T>>; children: ReactNode; submit?: string; className?: string; onDone?: (data: T) => ReactNode }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className={cx("space-y-3", className)}>
      {children}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : submit}</Button>
        {state?.ok === true && <span className="text-sm text-green">Saved ✓</span>}
        {state?.ok === false && <span role="alert" className="text-sm text-red">{state.error}</span>}
      </div>
      {state?.ok === true && onDone?.(state.data)}
    </form>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="font-arcade text-xs text-muted">{label.toUpperCase()}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full bg-[#fffaf0] px-3 py-2 text-base text-ink outline-none ring-2 ring-[var(--parch-edge)] focus:ring-[3px] focus:ring-[var(--gold-dk)]";

/** A one-click action button (toggle, grant, void…) with confirm + inline feedback. */
export function ActionButton({ run, label, confirm, tone = "ghost" }: { run: () => Promise<{ ok: boolean; error?: string }>; label: string; confirm?: string; tone?: "ghost" | "purple" | "gold" | "blue" | "green" }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        tone={tone}
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const res = await run();
            setMsg(res.ok ? "✓" : res.error ?? "Failed");
          });
        }}
      >
        {pending ? "…" : label}
      </Button>
      {msg && <span className={cx("text-xs", msg === "✓" ? "text-green" : "text-red")}>{msg}</span>}
    </span>
  );
}
