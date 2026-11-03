import { GamePage } from "@/components/game-page";

export const metadata = { title: "EIPsInsight Tour" };

export default function Page() {
  return (
    <GamePage
      slug="hq-tour"
      path="/play/protocol-hq/tour"
      title="EIPsInsight Tour"
      kicker="WORLD 05 · PROTOCOL HQ"
      blurb="Five quick missions across the real EIPsInsight. Open each link, find the answer."
      back={{ href: "/play/protocol-hq", label: "Protocol HQ" }}
      character="governance-wizard"
    />
  );
}
