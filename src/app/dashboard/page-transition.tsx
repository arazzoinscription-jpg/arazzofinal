"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLiteMode } from "@/lib/use-lite-mode";

/** Transition d'entrée appliquée à chaque sous-page du dashboard (fade + slide depuis le bas). */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lite = useLiteMode();

  // ⚡ Mobile / faible CPU / reduced-motion : navigation INSTANTANÉE (pas de
  // `mode="wait"` qui faisait attendre 0,4s la sortie avant d'afficher la page).
  if (lite) return <>{children}</>;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.2, 0.7, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
