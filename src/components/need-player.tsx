import { startPlaying } from "@/app/actions/player";
import { Button, Panel, PixelIcon, Sprite } from "./pixel";

/** Shown in place of a game when the visitor hasn't pressed START yet (e.g. deep-linked from a QR). */
export function NeedPlayer({ next, title = "Ready, player one?" }: { next: string; title?: string }) {
  return (
    <Panel tone="purple" className="mx-auto mt-6 max-w-md p-6 text-center">
      <Sprite name="explorer" size={112} className="anim-bob mx-auto" />
      <h2 className="font-pixel mt-3 text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-muted">One tap and you&apos;re in. No sign-up, no wallet.</p>
      <form action={startPlaying} className="mt-5">
        <input type="hidden" name="next" value={next} />
        <Button tone="gold" className="w-full" type="submit">
          <PixelIcon name="star" size={20} /> START PLAYING
        </Button>
      </form>
    </Panel>
  );
}
