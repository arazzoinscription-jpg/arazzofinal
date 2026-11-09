"use client";

import { useState } from "react";
import LevelTestPopup from "@/lib/level-test-popup";
import { utmDeLURL } from "@/lib/landing-kit";

/** Le test de niveau, en arabe (résultat renvoyé au CRM comme partout). */
export function BoutonTest({ texte = "📝 ما تعرفيش مستواكِ؟ ديري اختبار المستوى", classe = "nv-btn nv-btn-2" }: { texte?: string; classe?: string }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <>
      <button type="button" className={classe} onClick={() => setOuvert(true)}>{texte}</button>
      {ouvert ? <LevelTestPopup slug="niveau-couture-ar" langue="ar" utm={utmDeLURL()} onClose={() => setOuvert(false)} /> : null}
    </>
  );
}

/**
 * Lien vers le formulaire d'inscription EXISTANT (en ligne ou présentiel), ouvert directement en arabe :
 * on garde la langue choisie par ces pages (même clé que les landings), puis on y va.
 */
export function LienInscription({ href, cle, className, children }: {
  href: string; cle: "arazzo_formation_langue" | "arazzo_presentiel_langue"; className?: string; children: React.ReactNode;
}) {
  return (
    <a href={href} className={className}
      onClick={() => { try { window.localStorage.setItem(cle, "ar"); } catch { /* ignore */ } }}>
      {children}
    </a>
  );
}
