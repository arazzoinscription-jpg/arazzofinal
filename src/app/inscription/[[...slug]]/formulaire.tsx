"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { LandingStyles, utmDeLURL } from "@/lib/landing-kit";
import { pixelEvent } from "@/lib/pixel-events";
import { suggestionEmail } from "@/lib/inscription-gratuite";
import { inscrireGratuitement, type ResultatInscription } from "@/app/actions/inscription-gratuite";

const T = {
  fr: {
    dir: "ltr", toggle: "العربية", eyebrow: "Inscription gratuite", titre: "Votre compte", titreAccent: " Arazzo offert",
    accroche: "Créez votre compte en 30 secondes : votre cours gratuit, votre espace et l'application vous attendent.",
    cours: "Votre cadeau :", nom: "Nom et prénom", phNom: "Ex. Amina Belkacem", email: "Adresse e-mail", phEmail: "votre@email.com",
    tel: "Téléphone (WhatsApp)", phTel: "Facultatif", wilaya: "Wilaya", phWilaya: "Facultatif",
    consent: "Je souhaite recevoir les nouveautés et les offres d'Arazzo.", envoyer: "Créer mon compte gratuit", envoi: "Création…",
    note: "Vos accès (identifiant et mot de passe) vous sont aussi envoyés par e-mail.",
    vouliez: "Vouliez-vous dire", oui: "Oui, corriger",
    bravo: "Votre compte est créé ✓", connectee: "Vous êtes déjà connectée sur ce téléphone.",
    envoye: (e: string) => `Vos accès sont envoyés à ${e} (pensez à regarder dans les spams).`,
    pasEnvoye: "L'e-mail tarde : vous êtes connectée ici, et vous pourrez choisir votre mot de passe dans votre profil.",
    existant: "Vous avez déjà un compte Arazzo", existantTxt: (e: string) => `Vos accès viennent d'être renvoyés à ${e}.`,
    voirCours: "▶ Regarder mon cours gratuit", installer: "📲 Installer l'application", plateforme: "Découvrir la plateforme", connexion: "Me connecter",
    dejaConnectee: "Vous êtes déjà connectée", dejaTxt: "Votre cours gratuit et votre espace vous attendent.",
  },
  ar: {
    dir: "rtl", toggle: "Français", eyebrow: "تسجيل مجاني", titre: "حسابك في", titreAccent: " أرازو مجاناً",
    accroche: "أنشئي حسابك في 30 ثانية: درسك المجاني، مساحتك والتطبيق في انتظارك.",
    cours: "هديتك:", nom: "الاسم واللقب", phNom: "مثال: أمينة بلقاسم", email: "البريد الإلكتروني", phEmail: "votre@email.com",
    tel: "الهاتف (واتساب)", phTel: "اختياري", wilaya: "الولاية", phWilaya: "اختياري",
    consent: "أرغب في تلقي جديد وعروض أرازو.", envoyer: "إنشاء حسابي المجاني", envoi: "جارٍ الإنشاء…",
    note: "ستصلك معلومات الدخول (المعرف وكلمة السر) أيضاً عبر البريد الإلكتروني.",
    vouliez: "هل تقصدين", oui: "نعم، صححي",
    bravo: "تم إنشاء حسابك ✓", connectee: "أنتِ متصلة الآن على هذا الهاتف.",
    envoye: (e: string) => `أرسلنا معلومات الدخول إلى ${e} (تفقدي البريد غير المرغوب فيه).`,
    pasEnvoye: "تأخر البريد: أنتِ متصلة هنا، ويمكنك اختيار كلمة السر من ملفك الشخصي.",
    existant: "لديك حساب في أرازو مسبقاً", existantTxt: (e: string) => `أعدنا إرسال معلومات الدخول إلى ${e}.`,
    voirCours: "▶ شاهدي درسي المجاني", installer: "📲 تثبيت التطبيق", plateforme: "اكتشفي المنصة", connexion: "تسجيل الدخول",
    dejaConnectee: "أنتِ متصلة مسبقاً", dejaTxt: "درسك المجاني ومساحتك في انتظارك.",
  },
} as const;

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, o: { sitekey: string; callback: (t: string) => void; "expired-callback"?: () => void; language?: string }) => string; reset: (id?: string) => void } }
}

const CLE_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** Le formulaire du lien d'inscription gratuite (compte visiteuse + cours gratuit). */
export function FormulaireInscription({ slug, coursTitre, coursHref, dejaConnectee }: { slug: string | null; coursTitre: string | null; coursHref: string | null; dejaConnectee: boolean }) {
  const [langue, setLangue] = useState<"fr" | "ar">("fr");
  const t = T[langue];
  const [v, setV] = useState({ nom: "", email: "", telephone: "", wilaya: "", piege: "" });
  const [consent, setConsent] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Extract<ResultatInscription, { ok: true }> | null>(null);
  const [jeton, setJeton] = useState("");
  const ouvertLe = useRef(0);
  const zoneTurnstile = useRef<HTMLDivElement>(null);
  const idTurnstile = useRef<string | null>(null);

  useEffect(() => { ouvertLe.current = Date.now(); }, []);

  function rendreTurnstile() {
    if (!CLE_TURNSTILE || !window.turnstile || !zoneTurnstile.current || idTurnstile.current) return;
    idTurnstile.current = window.turnstile.render(zoneTurnstile.current, { sitekey: CLE_TURNSTILE, callback: setJeton, "expired-callback": () => setJeton(""), language: langue });
  }
  useEffect(() => { rendreTurnstile(); });

  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnvoi(true);
    try {
      const r = await inscrireGratuitement({ slug, ...v, consent, ouvertLe: ouvertLe.current, jeton, utm: utmDeLURL() });
      if (!r.ok) {
        setErreur(r.erreur);
        if (r.suggestion) setSuggestion(r.suggestion);
        if (idTurnstile.current) { window.turnstile?.reset(idTurnstile.current); setJeton(""); }
        return;
      }
      setResultat(r);
      if (r.statut === "cree") {
        pixelEvent("CompleteRegistration", { content_name: coursTitre ?? "inscription gratuite", status: "visiteuse" },
          { name: "sign_up", params: { method: "inscription_gratuite" } });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErreur("Une erreur est survenue, réessayez.");
    } finally {
      setEnvoi(false);
    }
  }

  const lienCours = resultat?.coursHref ?? coursHref;
  const boutons = (connexion: boolean) => (
    <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
      {lienCours ? <a className="pl-cta" href={lienCours} style={{ textAlign: "center", textDecoration: "none" }}>{t.voirCours}</a> : null}
      <a className="pl-cta" href="/application" style={{ textAlign: "center", textDecoration: "none", background: "#2A0880" }}>{t.installer}</a>
      <a className="pl-cta" href={connexion ? `/login?email=${encodeURIComponent(v.email.trim())}` : "/communaute"} style={{ textAlign: "center", textDecoration: "none", background: "transparent", color: "#5B16F9", border: "2px solid #5B16F9" }}>
        {connexion ? t.connexion : t.plateforme}
      </a>
    </div>
  );

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />
      {CLE_TURNSTILE ? <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={rendreTurnstile} /> : null}
      <button type="button" className="pl-langue" onClick={() => setLangue((l) => (l === "fr" ? "ar" : "fr"))}>🌐 {t.toggle}</button>

      <header className="pl-hero">
        <div className="pl-hero-in">
          <div className="pl-marque">
            <a href="/offres" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pl-logo" src="/arazzo-icon.png" alt="Arazzo" width={40} height={40} />
              <span className="pl-marque-nom">Arazzo <em>Formation</em></span>
            </a>
          </div>
          <span className="pl-eyebrow">{t.eyebrow}</span>
          <h1 className="pl-titre">{t.titre}<em>{t.titreAccent}</em></h1>
          <p className="pl-tagline">{t.accroche}</p>
        </div>
      </header>

      <div className="pl-wrap">
        <div className="pl-card">
          {coursTitre ? <p className="pl-lede"><strong>{t.cours}</strong> {coursTitre}</p> : null}

          {dejaConnectee && !resultat ? (
            <section className="pl-section">
              <h2 className="pl-h2">{t.dejaConnectee}</h2>
              <p className="pl-lede">{t.dejaTxt}</p>
              {boutons(false)}
            </section>
          ) : resultat ? (
            <section className="pl-section" role="status">
              <h2 className="pl-h2">{resultat.statut === "cree" ? t.bravo : t.existant}</h2>
              {resultat.statut === "cree" ? (
                <>
                  {resultat.connectee ? <p className="pl-lede">{t.connectee}</p> : null}
                  <p className="pl-note">{resultat.emailEnvoye ? t.envoye(v.email.trim()) : t.pasEnvoye}</p>
                </>
              ) : <p className="pl-lede">{t.existantTxt(v.email.trim())}</p>}
              {boutons(!resultat.connectee)}
            </section>
          ) : (
            <form className="pl-form" onSubmit={envoyer} noValidate>
              <div className="pl-fields">
                <label className="pl-field">
                  <span>{t.nom} *</span>
                  <input value={v.nom} onChange={(e) => set("nom", e.target.value)} placeholder={t.phNom} autoComplete="name" required maxLength={80} />
                </label>
                <label className="pl-field">
                  <span>{t.email} *</span>
                  <input type="email" value={v.email} onChange={(e) => { set("email", e.target.value); setSuggestion(null); }}
                    onBlur={() => setSuggestion(suggestionEmail(v.email))} placeholder={t.phEmail} autoComplete="email" inputMode="email" required maxLength={160} dir="ltr" />
                </label>
                {suggestion ? (
                  <p className="pl-note" style={{ marginTop: -4 }}>
                    {t.vouliez} <strong dir="ltr">{suggestion}</strong> ?{" "}
                    <button type="button" onClick={() => { set("email", suggestion); setSuggestion(null); }} style={{ color: "#5B16F9", fontWeight: 700, textDecoration: "underline", background: "none", border: 0, cursor: "pointer" }}>{t.oui}</button>
                  </p>
                ) : null}
                <label className="pl-field">
                  <span>{t.tel}</span>
                  <input type="tel" value={v.telephone} onChange={(e) => set("telephone", e.target.value)} placeholder={t.phTel} autoComplete="tel" maxLength={30} dir="ltr" />
                </label>
                <label className="pl-field">
                  <span>{t.wilaya}</span>
                  <input value={v.wilaya} onChange={(e) => set("wilaya", e.target.value)} placeholder={t.phWilaya} maxLength={60} />
                </label>
                {/* Piège à robots : invisible pour les personnes, rempli par les robots. */}
                <div aria-hidden style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
                  <label>Site web<input tabIndex={-1} autoComplete="off" value={v.piege} onChange={(e) => set("piege", e.target.value)} /></label>
                </div>
              </div>
              <label className="pl-consent">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>{t.consent}</span>
              </label>
              {CLE_TURNSTILE ? <div ref={zoneTurnstile} style={{ margin: "10px 0" }} /> : null}
              {erreur ? <div className="pl-erreur">{erreur}</div> : null}
              <button type="submit" className="pl-cta" disabled={envoi || (Boolean(CLE_TURNSTILE) && !jeton)}>{envoi ? t.envoi : t.envoyer}</button>
              <p className="pl-note">{t.note}</p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
