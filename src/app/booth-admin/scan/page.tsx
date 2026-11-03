import { Suspense } from "react";
import { requireAdminPage } from "@/lib/server/admin";
import { Scanner } from "@/components/admin/scanner";
import { PixelLoader } from "@/components/pixel";

export const metadata = { title: "Scan & Redeem" };

export default function ScanPage({ searchParams }: PageProps<"/booth-admin/scan">) {
  return (
    <>
      <h1 className="font-pixel mb-4 text-3xl">Scan &amp; redeem</h1>
      <Suspense fallback={<PixelLoader />}>
        <Inner searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Inner({ searchParams }: { searchParams: PageProps<"/booth-admin/scan">["searchParams"] }) {
  await requireAdminPage("VOLUNTEER");
  const { t } = await searchParams;
  return <Scanner initialToken={typeof t === "string" ? t : undefined} />;
}
