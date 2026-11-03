import { cx } from "./pixel";

// Streak helpers shared by the server-rendered home card and the client daily quiz.

export function nextMilestone(streak: number) {
  if (streak < 3) return { at: 3, reward: "a booster pack" };
  const at = Math.ceil((streak + 1) / 7) * 7;
  return { at, reward: "an Epic+ booster pack" };
}

export function Flame({ streak, size = "md" }: { streak: number; size?: "md" | "lg" }) {
  return (
    <span className={cx("font-pixel inline-flex items-center gap-1", size === "lg" ? "text-4xl" : "text-xl")}>
      <span className={cx(streak > 0 && "anim-bob", "inline-block")} aria-hidden>🔥</span>
      <span>{streak}</span>
      <span className={cx("font-arcade text-muted", size === "lg" ? "text-xs" : "text-[10px]")}>day{streak === 1 ? "" : "s"}</span>
    </span>
  );
}
