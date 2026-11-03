import { LoginForm } from "./login-form";
import { Panel, PixelIcon } from "@/components/pixel";

export const metadata = { title: "Staff login" };

export default function LoginPage() {
  return (
    <Panel tone="purple" className="mx-auto mt-10 max-w-sm p-6">
      <PixelIcon name="lock" size={36} />
      <h1 className="font-pixel mt-3 text-2xl">Booth staff login</h1>
      <p className="mt-1 text-sm text-muted">Volunteers and admins only. Player progress never needs this.</p>
      <LoginForm />
    </Panel>
  );
}
