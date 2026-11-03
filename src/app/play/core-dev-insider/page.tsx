import { GamePage } from "@/components/game-page";

export const metadata = { title: "Core Dev Insider" };

export default function Page() {
  return (
    <GamePage
      slug="core-dev-insider"
      path="/play/core-dev-insider"
      title="Core Dev Insider"
      kicker="RANKED QUEST · BEST RUN COUNTS"
      blurb="Ethereum is built in public. Can you find out what core developers decided?"
      back={{ href: "/play", label: "Quest map" }}
      character="governance-wizard"
    />
  );
}
