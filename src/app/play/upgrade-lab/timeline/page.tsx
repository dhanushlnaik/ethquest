import { GamePage } from "@/components/game-page";

export const metadata = { title: "Rebuild the Timeline" };

export default function Page() {
  return (
    <GamePage
      slug="timeline-rebuild"
      path="/play/upgrade-lab/timeline"
      title="Rebuild the Timeline"
      kicker="WORLD 02 · THE UPGRADE LAB"
      blurb="Ten years of Ethereum upgrades got scrambled. Put history back together."
      back={{ href: "/play/upgrade-lab", label: "Upgrade Lab" }}
      character="protocol-engineer"
    />
  );
}
