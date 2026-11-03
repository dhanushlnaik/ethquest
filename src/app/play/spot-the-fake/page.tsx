import { GamePage } from "@/components/game-page";

export const metadata = { title: "Spot the Fake" };

export default function Page() {
  return (
    <GamePage
      slug="spot-the-fake"
      path="/play/spot-the-fake"
      title="Spot the Fake"
      kicker="WORLD 01 · THE ARCADE"
      blurb="Two proposals are real. One is completely made up. Find the impostor."
      back={{ href: "/play/arcade", label: "The Arcade" }}
      character="dna-rabbit-hole-explorer"
    />
  );
}
