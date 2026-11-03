import { GamePage } from "@/components/game-page";

export const metadata = { title: "Missing Piece" };

export default function Page() {
  return (
    <GamePage
      slug="timeline-missing"
      path="/play/upgrade-lab/missing-piece"
      title="Missing Piece"
      kicker="WORLD 02 · THE UPGRADE LAB"
      blurb="A stretch of history has a hole in it. Which upgrade fits?"
      back={{ href: "/play/upgrade-lab", label: "Upgrade Lab" }}
      character="researcher"
    />
  );
}
