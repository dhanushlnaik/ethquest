import QRCode from "qrcode";
import { Panel, PixelIcon, Sprite, Tag } from "./pixel";
import { ROLES, STAGE_LABEL, type BuiltPathway } from "@/lib/games/content";
import type { IconName } from "@/lib/pixel/icons";

const STAGE_ICON: Record<string, IconName> = { START: "flame", EXPLORE: "map", PARTICIPATE: "user", CONTRIBUTE: "brick", NEXT: "star" };
const ACCENT: Record<string, string> = { purple: "var(--c-grape-dk)", blue: "var(--c-blue)", green: "var(--c-green-dk)", gold: "var(--c-orange)" };

export async function PathwayCard({ snapshot, shareUrl }: { snapshot: BuiltPathway & { nickname?: string }; shareUrl: string }) {
  const qr = await QRCode.toString(shareUrl, { type: "svg", margin: 1, color: { dark: "#07060d", light: "#ffffff" } });
  const sprite = ROLES.find((r) => r.label === snapshot.role)?.sprite ?? "explorer";
  const accent = ACCENT[snapshot.color] ?? "var(--c-grape-dk)";
  return (
    <Panel tone="gold" className="overflow-hidden">
      <div className="relative bg-gradient-to-br from-purple-lo/50 via-white to-blue-lo/30 p-5">
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
        <span aria-hidden className="absolute bottom-6 left-[27px] top-6 w-[3px] bg-gradient-to-b from-gold via-purple to-blue" />
        {snapshot.steps.map((s, i) => (
          <li key={s.stage} className="relative">
            <span className="absolute -left-[34px] top-1 grid h-7 w-7 place-items-center rounded-full border-2 border-ink bg-white">
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
                    <a href={r.url} target="_blank" rel="noopener noreferrer" data-track="product" className="text-blue underline decoration-blue-lo underline-offset-4 hover:text-blue-hi">
                      {r.label} ↗
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-4 border-t-[3px] border-line bg-sunken p-4">
        <div className="h-24 w-24 shrink-0 bg-white p-1 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} aria-label="QR code to revisit this pathway" />
        <div className="min-w-0 text-sm">
          <p className="font-arcade text-xs text-purple-hi">SCAN TO REVISIT</p>
          <p className="mt-1 text-muted">Your path stays here after Devcon. Bookmark it or scan the code.</p>
          {snapshot.nickname && <p className="font-pixel mt-1 text-gold">— {snapshot.nickname}</p>}
        </div>
      </div>
    </Panel>
  );
}
