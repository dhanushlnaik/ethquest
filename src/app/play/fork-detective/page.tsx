import { GamePage } from "@/components/game-page";

export const metadata = { title: "Fork Detective" };

export default function Page() {
  return (
    <GamePage
      slug="fork-detective"
      path="/play/fork-detective"
      title="Fork Detective"
      kicker="RANKED QUEST · BEST RUN COUNTS"
      blurb="Match the clues. Solve the case."
      back={{ href: "/play", label: "Quest map" }}
      character="protocol-engineer"
    />
  );
}
