"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PixelIcon } from "./pixel";
import type { IconName } from "@/lib/pixel/icons";

/** Celebration burst: pixel stars/coins fly out from the centre of the parent. */
export function Burst({ icons = ["star", "coin", "bolt"], count = 12 }: { icons?: IconName[]; count?: number }) {
  const [parts] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 70 + Math.random() * 70;
      return { i, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 20, r: Math.random() * 180 - 90, icon: icons[i % icons.length] };
    }),
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-visible">
      {parts.map((p) => (
        <motion.span
          key={p.i}
          className="absolute"
          initial={{ x: 0, y: 0, scale: 0.2, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, scale: 1, opacity: 0, rotate: p.r }}
          transition={{ duration: 0.85, ease: [0.2, 0.8, 0.3, 1] }}
        >
          <PixelIcon name={p.icon} size={22} />
        </motion.span>
      ))}
    </div>
  );
}
