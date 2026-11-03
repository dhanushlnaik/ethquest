import { Suspense } from "react";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireAdminPage } from "@/lib/server/admin";
import { findSession } from "@/lib/server/live";
import { HostScreen } from "@/components/live/host-screen";
import { PixelLoader } from "@/components/pixel";
import { SITE_URL } from "@/lib/site";

export const metadata = { title: "Big screen" };

export default function LiveHostRoom({ params }: PageProps<"/live/host/[code]">) {
  return (
    <Suspense fallback={<PixelLoader label="Opening the room" />}>
      <Room params={params} />
    </Suspense>
  );
}

async function Room({ params }: { params: PageProps<"/live/host/[code]">["params"] }) {
  await requireAdminPage("VOLUNTEER");
  const { code } = await params;
  const session = await findSession(code);
  if (!session) notFound();
  const joinUrl = `${SITE_URL}/live?code=${session.code}`;
  const qrSvg = await QRCode.toString(joinUrl, { type: "svg", margin: 1, color: { dark: "#2a1d12", light: "#fff8e8" } });
  return <HostScreen code={session.code} joinUrl={`${SITE_URL}/live`} qrSvg={qrSvg} />;
}
