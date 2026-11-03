"use client";

import { useActionState } from "react";
import { adminLogin } from "@/app/actions/admin";
import { Button } from "@/components/pixel";
import { inputCls } from "@/components/admin/forms";

export function LoginForm() {
  const [state, action, pending] = useActionState(adminLogin, null);
  return (
    <form action={action} className="mt-5 space-y-3">
      <input name="email" type="email" required autoComplete="username" placeholder="Email" className={inputCls} />
      <input name="password" type="password" required autoComplete="current-password" placeholder="Password" className={inputCls} />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Checking…" : "Log in"}</Button>
      {state?.ok === false && <p role="alert" className="text-sm text-red">{state.error}</p>}
    </form>
  );
}
