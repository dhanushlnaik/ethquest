import Link from "next/link";
import { getCatalog, toView } from "@/lib/server/cards";
import { cardLabel } from "@/lib/cards/types";
import { PixelCard } from "./pixel-card";
import { MarkNewsSeen } from "./card-client";

type Change = { id: number; number: number; field: string; fromValue: string | null; toValue: string; createdAt: Date };

const line = (c: Change) => (c.field === "added" ? `New card released (${c.toValue})` : `${c.fromValue} → ${c.toValue}`);

/** Real-world status changes, as a strip of cards. Used for your news (home) and the whole catalog (collection). */
export async function ChangeStrip({ changes, title, subtitle, dismissible }: { changes: Change[]; title: string; subtitle: string; dismissible?: boolean }) {
  if (!changes.length) return null;
  const cat = await getCatalog();
  const latest = [...new Map(changes.map((c) => [c.number, c])).values()];
  return (
    <section className="px-panel px-panel--green p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-arcade text-xs text-gold">Living cards</p>
          <h2 className="font-pixel text-2xl">{title}</h2>
          <p className="text-sm text-muted">{subtitle}</p>
        </div>
        {dismissible && <MarkNewsSeen />}
      </div>
      <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {latest.map((c) => {
          const card = cat.byNumber.get(c.number);
          if (!card) return null;
          const view = toView(card);
          return (
            <li key={c.id} className="shrink-0 text-center">
              <Link href={`/play/cards/${c.number}`}><PixelCard card={view} size="sm" /></Link>
              <p className="font-arcade mt-1 max-w-[132px] text-[10px] leading-tight">{cardLabel(view)}</p>
              <p className="max-w-[132px] text-xs text-muted">{line(c)}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
