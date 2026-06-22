"use client";

import { motion, type Variants } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";

type Anim = "up" | "left" | "right" | "zoom" | "fade";

// Décalage initial selon le type d'animation
const OFFSET: Record<Anim, { x?: number; y?: number; scale?: number }> = {
  up: { y: 40 },
  left: { x: -40 },
  right: { x: 40 },
  zoom: { scale: 0.95 },
  fade: {},
};

/**
 * Apparition au scroll via Motion (framer-motion).
 * API conservée à l'identique (children, className, animation, delay ms, once)
 * pour rester compatible avec les usages existants.
 * Respecte « prefers-reduced-motion ».
 */
export function Reveal({
  children,
  className = "",
  animation = "up",
  delay = 0,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  animation?: Anim;
  delay?: number;
  once?: boolean;
}) {
  const reduce = useReducedMotionSafe();

  const variants: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, ...OFFSET[animation] },
    show: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { duration: 0.7, ease: [0.2, 0.7, 0.3, 1], delay: delay / 1000 },
    },
  };

  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.15, margin: "0px 0px -8% 0px" }}
    >
      {children}
    </motion.div>
  );
}
