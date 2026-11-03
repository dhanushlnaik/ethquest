/**
 * Re-mounts on every /play navigation: a quick slide-in between screens.
 * Pure CSS, so server-rendered content is visible before JavaScript loads (slow booth Wi-Fi).
 */
export default function PlayTemplate({ children }: { children: React.ReactNode }) {
  return <div className="anim-screen-in">{children}</div>;
}
