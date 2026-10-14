"use client";
/// <reference types="react-dom/canary" />

import { useFormStatus } from "react-dom";

/** Bouton d'envoi désactivé pendant l'envoi (évite le double clic). Sans JavaScript, bouton ordinaire. */
export function BoutonEnvoi({ libelle, className }: { libelle: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={`${className} disabled:opacity-60 disabled:cursor-wait`}>
      {pending ? "Enregistrement…" : libelle}
    </button>
  );
}
