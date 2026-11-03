import { GamePage } from "@/components/game-page";

export const metadata = { title: "Upgrade Match" };

export default function Page() {
  return (
    <GamePage
      slug="timeline-match"
      path="/play/upgrade-lab/match"
      title="Upgrade Match"
      kicker="WORLD 02 · THE UPGRADE LAB"
      blurb="Every upgrade changed something. Match them up."
      back={{ href: "/play/upgrade-lab", label: "Upgrade Lab" }}
      character="protocol-engineer"
    />
  );
}
