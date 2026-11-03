"use client";

import { createStaff } from "@/app/actions/admin";
import { ActionForm, Field, inputCls } from "./forms";

export function StaffCreate() {
  return (
    <ActionForm
      action={createStaff}
      submit="Create staff account"
      className="grid gap-3 sm:grid-cols-3"
      onDone={(d) => (
        <p className="sm:col-span-3 text-sm text-gold">
          Temporary password (shown once, share it privately): <code className="font-arcade">{d.password}</code>
        </p>
      )}
    >
      <Field label="Name"><input name="name" required className={inputCls} /></Field>
      <Field label="Email"><input name="email" type="email" required className={inputCls} /></Field>
      <Field label="Role">
        <select name="role" className={inputCls} defaultValue="VOLUNTEER">
          <option>VOLUNTEER</option>
          <option>ADMIN</option>
          <option>OWNER</option>
        </select>
      </Field>
    </ActionForm>
  );
}
