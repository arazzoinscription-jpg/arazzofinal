"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Pixel Meta — chargé sur TOUT le site, mais seulement après consentement.
 *
 * Deux règles tenues :
 *   - Il ne se charge QUE si la personne a accepté les cookies (bandeau
 *     `CookieConsent`, clé `arazzo_cookie_consent_v1`). Refuser = aucun pixel.
 *   - Dans une application Next (navigation sans rechargement), un « PageView »
 *     doit être émis à CHAQUE changement de page, pas seulement au premier
 *     chargement — sinon Meta ne voit qu'une page par visite.
 *
 * L'identifiant vient de `NEXT_PUBLIC_META_PIXEL_ID` (public par nature). Absent,
 * le composant ne fait rien.
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const CONSENT_KEY = "arazzo_cookie_consent_v1";

export function MetaPixel() {
  const [autorise, setAutorise] = useState(false);
  const pathname = usePathname();
  const premier = useRef(true);

  // Écoute le consentement : au montage, et quand la personne clique « Accepter »
  // (le bandeau émet l'événement `arazzo-cookie-consent`), sans recharger la page.
  useEffect(() => {
    if (!PIXEL_ID) return undefined;
    const verifier = () => {
      try {
        if (localStorage.getItem(CONSENT_KEY) === "accepted") setAutorise(true);
      } catch { /* stockage indisponible → on ne charge pas */ }
    };
    verifier();
    window.addEventListener("arazzo-cookie-consent", verifier);
    return () => window.removeEventListener("arazzo-cookie-consent", verifier);
  }, []);

  // PageView à chaque changement de route. Le TOUT premier PageView est déjà
  // émis par le script d'init ci-dessous : on saute donc le montage initial pour
  // ne pas le compter deux fois.
  useEffect(() => {
    if (!autorise) return;
    if (premier.current) { premier.current = false; return; }
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    if (typeof fbq === "function") fbq("track", "PageView");
  }, [pathname, autorise]);

  if (!PIXEL_ID || !autorise) return null;

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${PIXEL_ID}');
fbq('track','PageView');`}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
