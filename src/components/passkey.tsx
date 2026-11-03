"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { passkeyLoginOptions, passkeyLoginVerify, passkeyRegisterOptions, passkeyRegisterVerify } from "@/app/actions/passkey";
import { play } from "@/lib/audio";
import { Button, PixelIcon } from "./pixel";

const friendly = (e: unknown) =>
  e instanceof Error && /NotAllowed|AbortError|cancel/i.test(`${e.name} ${e.message}`) ? "Cancelled. Try again whenever you like." : "Your device couldn't create a passkey here.";

/** Attach a passkey to the current player so the profile survives a new phone or a cleared browser. */
export function SavePasskeyButton({ label = "Save with passkey", onSaved }: { label?: string; onSaved?: () => void }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      setMsg(null);
      if (!browserSupportsWebAuthn()) return setMsg("This browser doesn't support passkeys. Use a recovery code from your profile instead.");
      const opts = await passkeyRegisterOptions();
      if (!opts.ok) return setMsg(opts.error);
      try {
        const response = await startRegistration({ optionsJSON: opts.data });
        const res = await passkeyRegisterVerify(response);
        if (!res.ok) return setMsg(res.error);
        play("unlock");
        onSaved?.();
        router.refresh();
      } catch (e) {
        setMsg(friendly(e));
      }
    });
  return (
    <div>
      <Button tone="green" disabled={pending} onClick={save}><PixelIcon name="lock" size={18} /> {pending ? "Waiting for your device…" : label}</Button>
      {msg && <p className="mt-2 text-sm text-red">{msg}</p>}
    </div>
  );
}

export function SaveProfileCard() {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  return (
    <section className="px-panel px-panel--green flex flex-wrap items-center gap-4 p-4">
      <PixelIcon name="lock" size={40} />
      <div className="min-w-0 flex-1">
        <p className="font-pixel text-xl">Save your profile</p>
        <p className="text-sm text-muted">Keep your cards and XP forever. Use Face ID, fingerprint or your phone lock: no password, no email.</p>
      </div>
      <SavePasskeyButton onSaved={() => setHidden(true)} />
    </section>
  );
}

export function PasskeyLoginButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const login = () =>
    start(async () => {
      setMsg(null);
      if (!browserSupportsWebAuthn()) return setMsg("This browser doesn't support passkeys. Try a recovery code instead.");
      const opts = await passkeyLoginOptions();
      if (!opts.ok) return setMsg(opts.error);
      try {
        const response = await startAuthentication({ optionsJSON: opts.data });
        const res = await passkeyLoginVerify(response);
        if (!res.ok) return setMsg(res.error);
        play("levelup");
        router.push("/play");
        router.refresh();
      } catch (e) {
        setMsg(friendly(e));
      }
    });
  return (
    <div className="text-center">
      <Button size="lg" className="shine w-full" disabled={pending} onClick={login}><PixelIcon name="lock" size={20} /> {pending ? "Waiting for your device…" : "Log in with passkey"}</Button>
      {msg && <p className="mt-3 text-red">{msg}</p>}
    </div>
  );
}
