import { Suspense } from "react";
import { PlayerScreen } from "@/components/live/player-screen";
import { PixelLoader } from "@/components/pixel";

export default function LivePlayerPage({ params }: PageProps<"/live/[code]">) {
  return (
    <Suspense fallback={<PixelLoader label="Joining the room" />}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: PageProps<"/live/[code]">["params"] }) {
  const { code } = await params;
  return <PlayerScreen code={code.toUpperCase()} />;
}
