"use client";

import { motion, useSpring, type Variants } from "framer-motion";
import { useEffect, useState } from "react";

const ORANGE = "#E8650A";

/* 1 ─ Entrée : fade + slide depuis le bas */
export function Reveal({
  children, className, delay = 0, duration = 0.6, y = 24,
}: {
  children: React.ReactNode; className?: string; delay?: number; duration?: number; y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

/* 1 ─ Conteneur stagger (anime ses enfants en cascade au chargement) */
export function StaggerGroup({
  children, className, stagger = 0.1, delayChildren = 0,
}: {
  children: React.ReactNode; className?: string; stagger?: number; delayChildren?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren } } }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/* 1 ─ Élément staggeré (div) */
export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/* 1 + 5 ─ Carte-lien staggerée avec hover (lift + ombre) */
export function StaggerLink({
  children, className, href,
}: {
  children: React.ReactNode; className?: string; href: string;
}) {
  return (
    <motion.a
      href={href}
      className={className}
      variants={itemVariants}
      whileHover={{ y: -4, boxShadow: "0 8px 24px rgba(107,33,200,0.15)", transition: { duration: 0.25 } }}
    >
      {children}
    </motion.a>
  );
}

/* 2 ─ Bouton CTA (catalogue) */
export function CtaLink({
  children, className, href,
}: {
  children: React.ReactNode; className?: string; href: string;
}) {
  return (
    <motion.a
      href={href}
      className={className}
      whileHover={{ scale: 1.04, backgroundColor: ORANGE }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {children}
    </motion.a>
  );
}

/* 3 ─ Badge "Apprentie" */
export function AnimatedBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      whileHover={{ scale: 1.06 }}
    >
      {children}
    </motion.div>
  );
}

/* 4 ─ Tuiles XP (orange / violet) */
export function HoverTile({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {children}
    </motion.div>
  );
}

/* 8 ─ Compteur animé (useSpring) */
export function Counter({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(0, { stiffness: 80, damping: 20 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return () => unsub();
  }, [spring]);

  return <div className={className}>{display}</div>;
}
