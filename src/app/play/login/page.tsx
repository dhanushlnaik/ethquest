import Link from "next/link";
import { PasskeyLoginButton } from "@/components/passkey";
import { BrandMark } from "@/components/logo";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm pt-6">
      <section className="px-panel p-6 text-center">
        <BrandMark size={64} className="anim-float mx-auto" />
        <h1 className="font-pixel mt-3 text-2xl">Welcome back</h1>
        <p className="mt-1 text-muted">Use the passkey you saved your profile with: Face ID, fingerprint or screen lock.</p>
        <div className="mt-5"><PasskeyLoginButton /></div>
        <p className="mt-5 text-sm">
          No passkey? <Link href="/play/recover" className="underline underline-offset-2">Use a recovery code</Link> or <Link href="/play" className="underline underline-offset-2">start fresh</Link>.
        </p>
      </section>
    </div>
  );
}
