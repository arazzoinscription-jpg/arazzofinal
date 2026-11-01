"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

/** Cloudflare Turnstile tel que le script le pose sur `window` (typé ici, sans toucher au type global). */
type Turnstile = {
  render: (el: HTMLElement, o: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove?: (id: string) => void;
};
const ts = () => (typeof window === "undefined" ? undefined : (window as unknown as { turnstile?: Turnstile }).turnstile);

export const CLE_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/**
 * 🤖 LA CASE ANTI-ROBOTS de Cloudflare (Turnstile), pour l'inscription et la connexion.
 * `onJeton` reçoit le jeton ("" quand il expire) ; changer `remise` redessine la case (après un refus, le jeton
 * ne sert qu'une fois). Sans clé configurée, rien ne s'affiche et `onJeton` n'est jamais appelé.
 */
export function CaseAntiRobot({ onJeton, remise = 0, langue = "fr" }: { onJeton: (jeton: string) => void; remise?: number; langue?: string }) {
  const zone = useRef<HTMLDivElement>(null);
  const id = useRef<string | null>(null);
  const [absente, setAbsente] = useState(false);
  const rappel = useRef(onJeton);
  rappel.current = onJeton;

  function dessiner() {
    const t = ts();
    const z = zone.current;
    if (!CLE_TURNSTILE || !t || !z || id.current) return;
    id.current = t.render(z, {
      sitekey: CLE_TURNSTILE, language: langue,
      callback: (j: string) => { rappel.current(j); setAbsente(false); },
      "expired-callback": () => rappel.current(""),
      "error-callback": () => setAbsente(true),
    });
  }

  // Le script peut arriver après le premier affichage : on réessaie un moment, puis on propose de recharger.
  useEffect(() => {
    if (!CLE_TURNSTILE) return undefined;
    const debut = Date.now();
    const m = window.setInterval(() => {
      dessiner();
      const visible = Boolean(zone.current?.querySelector('input[name="cf-turnstile-response"]'));
      if (visible || Date.now() - debut > 10_000) { window.clearInterval(m); if (!visible) setAbsente(true); }
    }, 400);
    return () => {
      window.clearInterval(m);
      if (id.current) { try { ts()?.remove?.(id.current); } catch { /* déjà partie */ } id.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (remise && id.current) { ts()?.reset(id.current); rappel.current(""); }
  }, [remise]);

  if (!CLE_TURNSTILE) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={dessiner} />
      <div ref={zone} style={{ margin: "8px 0", minHeight: 65 }} />
      {absente ? (
        <p style={{ fontSize: 12, color: "#b45309" }}>
          La vérification anti-robot ne s’affiche pas. <button type="button" onClick={() => window.location.reload()} style={{ textDecoration: "underline" }}>Recharger la page</button>
        </p>
      ) : null}
    </>
  );
}
