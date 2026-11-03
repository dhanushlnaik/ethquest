import { GamePage } from "@/components/game-page";

export const metadata = { title: "What Comes Next?" };

export default function Page() {
  return (
    <GamePage
      slug="timeline-next"
      path="/play/upgrade-lab/next"
      title="What Comes Next?"
      kicker="WORLD 02 · THE UPGRADE LAB"
      blurb="Predict Ethereum's future, then see what the crowd thinks. Predictions only, never confirmed roadmap."
      back={{ href: "/play/upgrade-lab", label: "Upgrade Lab" }}
      character="dna-protocol-architect"
    />
  );
}
