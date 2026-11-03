"use client";

import { useState, useTransition } from "react";
import { lookupEip, type LookupResult } from "@/app/actions/player";
import { useFx } from "../fx";
import { Button, Panel, PixelIcon, Sprite } from "../pixel";
import { EipCard } from "./eip-card";
import { play } from "@/lib/sfx";

const SUGGESTIONS = [1559, 4844, 20, 721, 4337, 7702, 3675, 7594];

export function FindEip() {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);
  const [searched, setSearched] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const { celebrate } = useFx();

  const search = (n: number) => {
    if (!Number.isInteger(n) || n < 1 || n > 99999) return setError("Type a number between 1 and 99999.");
    setError(null);
    setSearched(n);
    start(async () => {
      try {
        const res = await lookupEip(n);
        if (!res.ok) return setError(res.error);
        setResult(res.data);
        play(res.data.eip ? "correct" : "wrong");
        celebrate(res.data.gains);
      } catch {
        setError("Couldn't reach EIPsInsight. Check your connection and try again.");
      }
    });
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(Number(value));
        }}
        className="flex gap-2"
      >
        <label className="px-panel px-panel--sunken flex flex-1 items-center gap-2 px-3">
          <span className="font-arcade text-xs text-gold">EIP-</span>
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={5}
            value={value}
            onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
            placeholder="4844"
            className="font-arcade h-14 w-full bg-transparent text-lg text-text outline-none placeholder:text-faint"
            aria-label="EIP number"
          />
        </label>
        <Button type="submit" disabled={pending || !value}>
          {pending ? "…" : "Go"}
        </Button>
      </form>
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        {SUGGESTIONS.map((n) => (
          <button key={n} onClick={() => { setValue(String(n)); search(n); }} className="font-arcade shrink-0 border-2 border-line px-3 py-2 text-xs text-muted hover:border-purple hover:text-text">
            {n}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="font-pixel mt-3 text-red">{error}</p>}
      <div className="mt-5" aria-live="polite">
        {pending && (
          <div className="flex items-center gap-3 text-muted">
            <PixelIcon name="magnifier" size={28} className="anim-bob" /> Searching the archives…
          </div>
        )}
        {!pending && result?.eip && <EipCard eip={result.eip} plain={result.plain} upgrade={result.upgrade} />}
        {!pending && result && !result.eip && searched && (
          <Panel className="flex items-center gap-4 p-5">
            <Sprite name="researcher" size={80} />
            <div>
              <p className="font-pixel text-xl">No EIP-{searched}… yet.</p>
              <p className="mt-1 text-sm text-muted">Numbers come from pull request IDs, so not every number exists. Maybe you&apos;ll write it?</p>
            </div>
          </Panel>
        )}
        {!pending && result?.fresh && result.gains.xp === 0 && result.eip && (
          <p className="mt-3 text-center text-xs text-muted">Discovery XP is capped at 3 EIPs. Keep exploring for fun!</p>
        )}
      </div>
    </div>
  );
}
