import { GamePage } from "@/components/game-page";

export const metadata = { title: "EIP Explorer" };

export default function Page() {
  return (
    <GamePage
      slug="eip-explorer"
      path="/play/eip-explorer/quest"
      title="EIP Explorer"
      kicker="RANKED QUEST · FIND AND IDENTIFY PROPOSALS"
      blurb="Use EIPsInsight to track down real proposals. Open the links, search, then answer."
      back={{ href: "/play", label: "Quest map" }}
      character="researcher"
    />
  );
}
