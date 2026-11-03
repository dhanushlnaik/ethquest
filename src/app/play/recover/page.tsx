import { Suspense } from "react";
import { recoverPlayer } from "@/app/actions/player";
import { Button, Panel, PixelIcon, SectionTitle } from "@/components/pixel";

export const metadata = { title: "Continue on this device" };

export default function RecoverPage({ searchParams }: PageProps<"/play/recover">) {
  return (
    <div className="mx-auto max-w-md">
      <SectionTitle kicker="Continue" title="Bring your progress here">
        On your old device, open your profile and tap &ldquo;Get recovery code&rdquo;. Then enter it below.
      </SectionTitle>
      <Panel tone="purple" className="p-5">
        <form action={recoverPlayer} className="space-y-3">
          <label className="px-panel px-panel--sunken flex items-center gap-2 px-3">
            <PixelIcon name="lock" size={20} />
            <input name="code" required maxLength={9} placeholder="ABCD-EFGH" autoCapitalize="characters" autoComplete="off" className="font-arcade h-14 w-full bg-transparent text-lg uppercase tracking-widest outline-none" aria-label="Recovery code" />
          </label>
          <Button type="submit" className="w-full">Restore progress</Button>
        </form>
        <Suspense>
          <ErrorNote searchParams={searchParams} />
        </Suspense>
      </Panel>
    </div>
  );
}

async function ErrorNote({ searchParams }: { searchParams: PageProps<"/play/recover">["searchParams"] }) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p role="alert" className="mt-3 text-sm text-red">
      {error === "busy" ? "Too many attempts. Wait a few minutes and try again." : "That code didn't match. Check it and try again."}
    </p>
  );
}
