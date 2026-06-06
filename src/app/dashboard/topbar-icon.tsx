"use client";

import { motion } from "framer-motion";

/** Wrapper d'icône de la topbar : scale + petite rotation au survol. */
export function TopbarIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.15, rotate: 8 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400 }}
    >
      {children}
    </motion.div>
  );
}
