"use client";

import { useState, useTransition } from "react";
import { grantBonusXP, renamePlayer } from "@/app/actions/admin";
import { Button } from "../pixel";
import { inputCls } from "./forms";

export function BonusXP({ playerId }: { playerId: string }) {
  const [amount, setAmount] = useState(5);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await grantBonusXP(playerId, amount, note);
          setMsg(r.ok ? "✓ granted" : r.error);
        });
      }}
    >
      <input type="number" min={-100} max={100} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className={`${inputCls} w-20`} aria-label="XP amount" />
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (e.g. EIP Wall)" required minLength={3} className={`${inputCls} w-48`} aria-label="Reason" />
      <Button size="sm" tone="gold" disabled={pending}>Grant XP</Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </form>
  );
}

export function Rename({ playerId, current }: { playerId: string; current: string }) {
  const [name, setName] = useState(current);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await renamePlayer(playerId, name);
          setMsg(r.ok ? "✓" : r.error);
        });
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-44`} aria-label="Nickname" />
      <Button size="sm" tone="ghost" disabled={pending || name === current}>Rename</Button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </form>
  );
}
