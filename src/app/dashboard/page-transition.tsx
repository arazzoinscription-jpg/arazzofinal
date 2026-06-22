"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";

/** Transition d'entrée appliquée à chaque sous-page du dashboard (fade + slide depuis le bas). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotionSafe();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.2, 0.7, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
