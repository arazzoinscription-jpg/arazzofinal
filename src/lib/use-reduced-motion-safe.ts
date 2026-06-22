"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Variante hydration-safe de `useReducedMotion`.
 *
 * `useReducedMotion()` de framer-motion renvoie `null` au rendu serveur mais la
 * vraie préférence (souvent `true`) dès la 1re passe client. Comme les variantes
 * d'animation branchent leur état `initial` sur cette valeur, framer-motion injecte
 * des styles inline différents serveur/client → hydration mismatch (« Prop did not
 * match »).
 *
 * Ce hook force `false` au SSR **et** à la 1re passe client (donc identique au HTML
 * serveur), puis applique la vraie préférence après le montage. Plus aucun mismatch,
 * et l'accessibilité « prefers-reduced-motion » reste respectée dès la 2e passe.
 */
export function useReducedMotionSafe(): boolean {
  const prefersReduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? !!prefersReduced : false;
}
