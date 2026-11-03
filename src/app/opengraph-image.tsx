import { publicDataUrl, shareImage } from "@/lib/server/og";

// Default link preview for every page that doesn't set its own (X, Farcaster, Slack, WhatsApp…).
export const alt = "ETHQuest by EIPsInsight: learn Ethereum standards, collect EIP cards, battle friends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const [mark, explorer, wizard] = await Promise.all([
    publicDataUrl("assets/brand/ethquest-mark-512.png"),
    publicDataUrl("assets/characters/explorer.png"),
    publicDataUrl("assets/characters/governance-wizard.png"),
  ]);
  return shareImage(
    <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mark} width={260} height={260} alt="" style={{ imageRendering: "pixelated" }} />
      <div style={{ display: "flex", flexDirection: "column", marginLeft: 48, flex: 1 }}>
        <div style={{ fontSize: 112, lineHeight: 1, color: "#f5c542" }}>ETHQuest</div>
        <div style={{ fontSize: 40, marginTop: 16 }}>Learn Ethereum standards.</div>
        <div style={{ fontSize: 40 }}>Collect every EIP. Battle your friends.</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={explorer} width={150} height={150} alt="" style={{ imageRendering: "pixelated" }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wizard} width={130} height={130} alt="" style={{ imageRendering: "pixelated" }} />
      </div>
    </div>,
  );
}
