import { GamePage } from "@/components/game-page";

export const metadata = { title: "Guess That EIP" };

export default function Page() {
  return (
    <GamePage
      slug="guess-that-eip"
      path="/play/guess-that-eip"
      title="Guess That EIP"
      kicker="RANKED QUEST · COUNTS FOR THE HOODIE"
      blurb="Five questions. Use a hint if you're stuck. Every answer comes with the story behind it."
      back={{ href: "/play", label: "Quest map" }}
      character="builder"
    />
  );
}
