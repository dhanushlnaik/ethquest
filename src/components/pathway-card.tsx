import QRCode from "qrcode";
import { Panel, PixelIcon, Sprite, Tag } from "./pixel";
import { ROLES, STAGE_LABEL, type BuiltPathway } from "@/lib/games/content";
import type { IconName } from "@/lib/pixel/icons";

const STAGE_ICON: Record<string, IconName> = { START: "flame", EXPLORE: "map", PARTICIPATE: "user", CONTRIBUTE: "brick", NEXT: "star" };
const ACCENT: Record<string, string> = { purple: "#5a3a7e", blue: "#24587a", green: "#3d6116", gold: "#9a5a00" };

export async function PathwayCard({ snapshot, shareUrl }: { snapshot: BuiltPathway & { nickname?: string }; shareUrl: string }) {
  const qr = await QRCode.toString(shareUrl, { type: "svg", margin: 1, color: { dark: "#2a1d12", light: "#fff8e8" } });
  const sprite = ROLES.find((r) => r.label === snapshot.role)?.sprite ?? "explorer";
  const accent = ACCENT[snapshot.color] ?? "#5a3a7e";
  return (
    <Panel tone="gold" className="overflow-hidden">
      <div className="relative p-5">
        <div className="flex items-start gap-4">
          <Sprite name={sprite} size={96} className="anim-bob shrink-0" />
          <div className="min-w-0">
            <p className="font-arcade text-xs text-gold">PATHWAY {snapshot.code}</p>
            <h2 className="font-pixel text-3xl leading-tight" style={{ color: accent }}>{snapshot.title}</h2>
            <p className="text-sm text-muted">{snapshot.tagline}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              <Tag tone="purple">{snapshot.role}</Tag>
              <Tag tone="blue">{snapshot.interest}</Tag>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm">{snapshot.summary}</p>
        <p className="font-pixel mt-2 text-sm text-gold">Goal: {snapshot.goal}</p>
      </div>
      <ol className="relative space-y-3 p-5 pl-12">
        <span aria-hidden className="absolute bottom-6 left-[26px] top-6 w-0 border-l-[4px] border-dashed border-[var(--gold-dk)]/70" />
        {snapshot.steps.map((s, i) => (
          <li key={s.stage} className="relative">
            <span className="px-panel px-panel--raised absolute -left-[38px] top-0 grid h-9 w-9 place-items-center">
              <PixelIcon name={STAGE_ICON[s.stage] ?? "star"} size={22} />
            </span>
            <p className="font-arcade text-xs text-gold">
              {i + 1} · {STAGE_LABEL[s.stage as keyof typeof STAGE_LABEL]?.toUpperCase() ?? s.stage}
            </p>
            <h3 className="font-pixel text-xl leading-tight">{s.title}</h3>
            <p className="mt-1 text-sm text-ink">{s.action}</p>
            {s.resources.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                {s.resources.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" data-track="product" className="text-blue underline decoration-2 underline-offset-4">
                      {r.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-4 border-t-[3px] border-dashed border-[var(--parch-lo)] p-4">
        <div className="h-24 w-24 shrink-0 bg-[#fff8e8] p-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code to revisit this pathway" />
        <div className="min-w-0 text-sm">
          <p className="font-arcade text-xs text-gold">SCAN TO REVISIT</p>
          <p className="mt-1 text-muted">Your path stays here after Devcon. Bookmark it or scan the code.</p>
          {snapshot.nickname && <p className="font-pixel mt-1 text-gold">— {snapshot.nickname}</p>}
        </div>
      </div>
    </Panel>
  );
}
