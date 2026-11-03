"use client";

import { useState, useTransition } from "react";
import { createRecoveryCode, updateProfile } from "@/app/actions/player";
import { Button, Panel, PixelIcon, Sprite } from "./pixel";
import { play } from "@/lib/sfx";

const AVATARS = [
  { id: "explorer", name: "The Explorer" },
  { id: "protocol-engineer", name: "Protocol Engineer" },
  { id: "researcher", name: "The Researcher" },
  { id: "builder", name: "The Builder" },
  { id: "governance-wizard", name: "Governance Wizard" },
];

export function ProfileEditor({ nickname, avatar }: { nickname: string; avatar: string }) {
  const [name, setName] = useState(nickname);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const save = (data: { nickname?: string; avatar?: string }) =>
    start(async () => {
      const res = await updateProfile(data).catch(() => null);
      if (!res?.ok) return setMsg({ ok: false, text: res?.error ?? "Couldn't save. Try again." });
      play("correct");
      setMsg({ ok: true, text: "Saved!" });
    });

  return (
    <Panel variant="raised" className="p-4">
      <h2 className="font-pixel text-xl">Choose your hero</h2>
      <ul className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {AVATARS.map((a) => (
          <li key={a.id}>
            <button
              onClick={() => save({ avatar: a.id })}
              disabled={pending}
              data-state={avatar === a.id ? "selected" : undefined}
              className="px-panel px-panel--sunken px-choice flex w-28 flex-col items-center p-2 text-center"
              aria-label={`Use ${a.name} avatar`}
            >
              <Sprite name={a.id} size={72} />
              <span className="font-pixel text-xs leading-tight">{a.name}</span>
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() !== nickname) save({ nickname: name });
        }}
      >
        <label className="px-panel px-panel--sunken flex flex-1 items-center px-3">
          <span className="sr-only">Nickname</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} className="font-pixel h-12 w-full bg-transparent text-lg outline-none" />
        </label>
        <Button type="submit" size="sm" disabled={pending || name.trim() === nickname}>Rename</Button>
      </form>
      {msg && <p className={`mt-2 text-sm ${msg.ok ? "text-green" : "text-red"}`}>{msg.text}</p>}
    </Panel>
  );
}

export function RecoveryCode() {
  const [code, setCode] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Panel variant="sunken" className="p-4">
      <h2 className="font-pixel flex items-center gap-2 text-xl">
        <PixelIcon name="lock" size={20} /> Switching phones?
      </h2>
      <p className="mt-1 text-sm text-muted">Get a one-time code to continue your progress on another device.</p>
      {code ? (
        <p className="font-arcade mt-3 text-xl tracking-[0.2em] text-gold">{code}</p>
      ) : (
        <Button
          tone="ghost"
          size="sm"
          className="mt-3"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createRecoveryCode().catch(() => null);
              if (res?.ok) setCode(res.data.code);
            })
          }
        >
          Get recovery code
        </Button>
      )}
      {code && <p className="mt-2 text-xs text-muted">Enter it at /play/recover on your other device. It works once.</p>}
    </Panel>
  );
}
