"use client";

import { motion } from "motion/react";

/** Re-mounts on every /play navigation: a quick springy slide-in between screens. */
export default function PlayTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}>
      {children}
    </motion.div>
  );
}
