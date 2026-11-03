import { Suspense } from "react";
import { BrandMark } from "@/components/logo";
import { JoinForm } from "@/components/live/player-screen";
import { PixelLoader } from "@/components/pixel";

export default function LiveJoinPage({ searchParams }: PageProps<"/live">) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-4">
      <header className="text-center">
        <BrandMark size={72} className="anim-float mx-auto" />
        <p className="font-arcade mt-3 text-xs text-gold">EIPsInsight · Live quiz</p>
        <h1 className="title-outline font-pixel text-3xl">EIP Signal Quiz</h1>
        <p className="mt-2 text-lg">Enter the code on the big screen and pick a name. No sign-up.</p>
      </header>
      <Suspense fallback={<PixelLoader />}>
        <Join searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Join({ searchParams }: { searchParams: PageProps<"/live">["searchParams"] }) {
  const { code } = await searchParams;
  const initial = typeof code === "string" ? code.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4) : "";
  return <JoinForm initialCode={initial} />;
}
