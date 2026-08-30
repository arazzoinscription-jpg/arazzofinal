"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Google tag (GA4) — chargé sur TOUT le site, mais seulement après consentement.
 *
 * Jumeau du Pixel Meta (`meta-pixel.tsx`), mêmes deux règles :
 *   - Il ne se charge QUE si la personne a accepté les cookies (bandeau
 *     `CookieConsent`, clé `arazzo_cookie_consent_v1`). Refuser = pas de GA4.
 *   - Dans une application Next (navigation sans rechargement), un `page_view`
 *     doit être émis à CHAQUE changement de page, pas seulement au premier
 *     chargement — sinon GA4 ne voit qu'une page par visite.
 *
 * L'identifiant vient de `NEXT_PUBLIC_GOOGLE_TAG_ID` (« G-XXXXXXX », public par
 * nature). Absent, le composant ne fait rien.
 */

const TAG_ID = process.env.NEXT_PUBLIC_GOOGLE_TAG_ID;
const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function GoogleTag() {
  const [autorise, setAutorise] = useState(false);
  const pathname = usePathname();
  const premier = useRef(true);

  // Écoute le consentement : au montage, et quand la personne clique « Accepter »
  // (le bandeau émet l'événement `arazzo-cookie-consent`), sans recharger la page.
  useEffect(() => {
    if (!TAG_ID) return undefined;
    const verifier = () => {
      try {
        if (localStorage.getItem(CONSENT_KEY) === "accepted") setAutorise(true);
      } catch { /* stockage indisponible → on ne charge pas */ }
    };
    verifier();
    window.addEventListener("arazzo-cookie-consent", verifier);
    return () => window.removeEventListener("arazzo-cookie-consent", verifier);
  }, []);

  // page_view à chaque changement de route. Le TOUT premier est déjà émis par le
  // `gtag('config', …)` d'init ci-dessous : on saute le montage initial pour ne
  // pas le compter deux fois.
  useEffect(() => {
    if (!autorise) return;
    if (premier.current) { premier.current = false; return; }
    const gtag = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
    if (typeof gtag === "function" && TAG_ID) {
      gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.href,
      });
    }
  }, [pathname, autorise]);

  if (!TAG_ID || !autorise) return null;

  return (
    <>
      {/* Charge la bibliothèque gtag.js */}
      <Script
        id="ga4-lib"
        src={`https://www.googletagmanager.com/gtag/js?id=${TAG_ID}`}
        strategy="afterInteractive"
      />
      {/* Initialise GA4 (émet le premier page_view) */}
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${TAG_ID}');`}
      </Script>
    </>
  );
}
