"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PublicOption, PublicRound, Reveal } from "@/lib/games/types";
import { Button, ExternalLink, Panel, PixelIcon, Tag, cx } from "../pixel";
import { play } from "@/lib/sfx";

export function TimelineRound({ round, reveal, pending, onSubmit }: { round: Extract<PublicRound, { kind: "order" }>; reveal?: Reveal; pending: boolean; onSubmit: (order: string[]) => void }) {
  const [items, setItems] = useState<PublicOption[]>(round.items);
  const r = reveal?.kind === "order" ? reveal : null;
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    play("tap");
    setItems((list) => arrayMove(list, list.findIndex((i) => i.id === e.active.id), list.findIndex((i) => i.id === e.over!.id)));
  };
  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= items.length) return;
    play("tap");
    setItems((list) => arrayMove(list, idx, to));
  };

  if (r) return <TimelineReveal reveal={r} submitted={items.map((i) => i.id)} />;

  return (
    <div>
      <h2 className="font-pixel text-2xl leading-snug sm:text-3xl">Rebuild Ethereum&apos;s history</h2>
      <p className="mt-1 text-sm text-muted">{round.prompt} Drag the cards or use the arrows.</p>
      <div className="mt-4 flex gap-3">
        <div className="flex flex-col items-center justify-between py-2" aria-hidden>
          <span className="font-arcade text-[11px] text-blue-hi">OLD</span>
          <span className="w-[3px] flex-1 bg-gradient-to-b from-blue-lo via-purple-lo to-gold-lo" />
          <span className="font-arcade text-[11px] text-gold">NEW</span>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <ol className="flex-1 space-y-2">
              {items.map((item, idx) => (
                <SortableCard key={item.id} item={item} idx={idx} count={items.length} onMove={move} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      </div>
      <Button tone="gold" className="mt-5 w-full" disabled={pending} onClick={() => onSubmit(items.map((i) => i.id))}>
        {pending ? "Checking history…" : "Lock in timeline"}
      </Button>
    </div>
  );
}

function SortableCard({ item, idx, count, onMove }: { item: PublicOption; idx: number; count: number; onMove: (idx: number, dir: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cx("relative", isDragging && "z-10")}>
      <div className={cx("px-panel px-panel--raised flex items-center gap-2 p-2 pl-3", isDragging && "px-panel--purple scale-[1.02]")}>
        <button {...attributes} {...listeners} className="flex min-h-[48px] flex-1 cursor-grab touch-none items-center gap-3 text-left active:cursor-grabbing" aria-label={`Drag ${item.label}`}>
          <span className="font-arcade grid h-8 w-8 shrink-0 place-items-center bg-sunken text-xs text-purple-hi">{idx + 1}</span>
          <span>
            <span className="font-pixel block text-xl leading-tight">{item.label}</span>
            {item.sub && <span className="block text-xs text-muted">{item.sub}</span>}
          </span>
        </button>
        <div className="flex flex-col">
          <button onClick={() => onMove(idx, -1)} disabled={idx === 0} className="font-arcade grid h-7 w-9 place-items-center text-xs text-muted disabled:opacity-20" aria-label={`Move ${item.label} earlier`}>▲</button>
          <button onClick={() => onMove(idx, 1)} disabled={idx === count - 1} className="font-arcade grid h-7 w-9 place-items-center text-xs text-muted disabled:opacity-20" aria-label={`Move ${item.label} later`}>▼</button>
        </div>
      </div>
    </li>
  );
}

function TimelineReveal({ reveal, submitted }: { reveal: Extract<Reveal, { kind: "order" }>; submitted: string[] }) {
  return (
    <div>
      <p className={cx("font-arcade text-xs", reveal.perfect ? "text-green" : "text-gold")}>
        {reveal.perfect ? "HISTORY RESTORED!" : `${reveal.correctCount}/${reveal.total} IN THE RIGHT SPOT`}
      </p>
      <h2 className="font-pixel mt-1 text-2xl">The real timeline</h2>
      <ol className="relative mt-5 space-y-4 pl-8">
        <span aria-hidden className="absolute bottom-2 left-3 top-2 w-[3px] bg-gradient-to-b from-blue-lo via-purple to-gold" />
        {reveal.correctOrder.map((u, i) => {
          const ok = submitted[i] === u.id;
          return (
            <motion.li key={u.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.18, type: "spring", stiffness: 220, damping: 20 }} className="relative">
              <span className="absolute -left-[26px] top-4 grid h-5 w-5 place-items-center rounded-full border-2 border-ink bg-white">
                <PixelIcon name={ok ? "check" : "diamond"} size={16} />
              </span>
              <Panel tone={ok ? "green" : "default"} variant="raised" className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="font-pixel text-xl">{u.label}</h3>
                  <span className="font-arcade text-xs text-gold">{u.date}</span>
                </div>
                <p className="mt-1 text-sm">{u.oneLiner}</p>
                {u.changes.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-muted">
                    {u.changes.slice(0, 3).map((c) => (
                      <li key={c} className="flex gap-2"><span className="text-purple-hi">▸</span>{c}</li>
                    ))}
                  </ul>
                )}
                {u.eips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {u.eips.map((e) => <Tag key={e.n} tone="blue">EIP-{e.n}</Tag>)}
                  </div>
                )}
                <p className="mt-3 text-sm">
                  <ExternalLink href={u.url}>{u.label} on EIPsInsight ↗</ExternalLink>
                </p>
              </Panel>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
