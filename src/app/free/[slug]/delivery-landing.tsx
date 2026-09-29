"use client";

/**
 * Delivery Page publique — le modèle UNIQUE de toutes les pages de cours gratuit.
 *
 * Même identité que les landings présentiel / en ligne (namespace « pl- » de
 * `@/lib/landing-kit`, bilingue FR/AR avec RTL, logo Arazzo). Le contenu vient
 * de l'instantané poussé par Arazzo OS ; rien n'est codé par cours.
 *
 * Parcours : si la page a un formulaire de capture, la visiteuse laisse ses
 * coordonnées puis le cours (vidéo Bunny + PDF) s'affiche ; sinon le cours est
 * visible d'emblée. Le bouton d'action (CTA) mène à l'offre payante associée.
 */

import { useEffect, useRef, useState } from "react";
import { LandingStyles, utmDeLURL } from "@/lib/landing-kit";
import { submitDeliveryLead } from "@/app/actions/delivery-lead";
import LevelTestPopup from "@/lib/level-test-popup";
import { ViewContentPixel } from "@/components/analytics/view-content-pixel";
import { pixelEvent } from "@/lib/pixel-events";
import { osTrackEvent } from "@/lib/os-track";
import PromoBanner from "./promo-banner";

type PageView = Record<string, any>;

const CLE_LANGUE = "arazzo_delivery_langue";

const T: Record<"ar" | "fr", any> = {
  fr: {
    dir: "ltr",
    marque: "Cours gratuit",
    eyebrow: "🎁 Cours offert",
    formTitle: "Recevez votre cours gratuit",
    fName: "Prénom et nom", fEmail: "E-mail", fPhone: "WhatsApp", fWilaya: "Wilaya",
    phName: "Votre nom", phEmail: "vous@exemple.com", phPhone: "0X XX XX XX XX", phWilaya: "Sétif",
    consent: "J’accepte d’être recontactée par Arazzo Formation.",
    submit: "Accéder au cours", sending: "Envoi…",
    note: "Un e-mail ou un numéro WhatsApp suffit.",
    thanks: "Merci ! Votre cours est prêt 👇",
    video: "Votre cours", pdf: "📄 Télécharger le PDF",
    ctaDefault: "Découvrir la formation complète",
    errContact: "Indiquez un e-mail ou un numéro WhatsApp.",
    errConsent: "Merci de cocher la case pour continuer.",
    errClosed: "Ce cours n’est plus disponible.",
    errGeneric: "Envoi impossible, réessayez.",
    pied: "Arazzo · École de couture — Sétif",
    testTitle: "Quel est votre niveau en couture ?",
    testText: "Faites notre test gratuit (2 minutes) : nous vous recommandons la formation qui vous correspond, avec le lien pour vous inscrire.",
    testBtn: "📝 Faites un test de couture",
    toggle: "العربية",
  },
  ar: {
    dir: "rtl",
    marque: "درس مجاني",
    eyebrow: "🎁 درس هدية",
    formTitle: "احصلي على درسك المجاني",
    fName: "الاسم واللقب", fEmail: "البريد الإلكتروني", fPhone: "واتساب", fWilaya: "الولاية",
    phName: "اسمك", phEmail: "you@example.com", phPhone: "0X XX XX XX XX", phWilaya: "سطيف",
    consent: "أوافق على أن يتم التواصل معي من طرف Arazzo Formation.",
    submit: "الوصول إلى الدرس", sending: "إرسال…",
    note: "يكفي بريد إلكتروني أو رقم واتساب.",
    thanks: "شكرًا! درسك جاهز 👇",
    video: "درسك", pdf: "📄 تحميل الملف PDF",
    ctaDefault: "اكتشفي التكوين الكامل",
    errContact: "يرجى إدخال بريد إلكتروني أو رقم واتساب.",
    errConsent: "يرجى الموافقة للمتابعة.",
    errClosed: "هذا الدرس لم يعد متاحًا.",
    errGeneric: "تعذّر الإرسال، حاولي مجددًا.",
    pied: "Arazzo · مدرسة الخياطة — سطيف",
    testTitle: "ما هو مستواك في الخياطة؟",
    testText: "قومي باختبارنا المجاني (دقيقتان): نقترح عليك التكوين المناسب لك مع رابط التسجيل.",
    testBtn: "📝 قومي باختبار الخياطة",
    toggle: "Français",
  },
};

/** Lecteur : Bunny Stream (iframe), fichier vidéo direct, ou autre intégration https. */
function lecteurVideo(url: unknown): { kind: "iframe" | "video"; src: string } | null {
  const u = String(url ?? "").trim();
  if (!/^https?:\/\//i.test(u)) return null;
  const bunny = u.match(/^https?:\/\/(iframe|player)\.mediadelivery\.net\/(play|embed)\/(\d+)\/([\w-]+)/i);
  if (bunny) return { kind: "iframe", src: `https://iframe.mediadelivery.net/embed/${bunny[3]}/${bunny[4]}?responsive=true` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u)) return { kind: "video", src: u };
  return { kind: "iframe", src: u };
}

/** Le dernier mot du titre en italique serif (le « accent » des landings Arazzo). */
function titreAvecAccent(titre: string) {
  const mots = String(titre ?? "").trim().split(/\s+/);
  if (mots.length < 2) return { debut: "", fin: titre };
  return { debut: mots.slice(0, -1).join(" ") + " ", fin: mots[mots.length - 1] };
}

const cssVar = (k: string, v: string) => ({ [k]: v }) as React.CSSProperties;

export default function DeliveryLanding({ data }: { data: PageView }) {
  const slug = String(data.slug);
  const form = (data.capture_form ?? {}) as Record<string, any>;
  const capture = form.enabled !== false;

  const [langue, setLangue] = useState<"fr" | "ar">("fr");
  const [debloque, setDebloque] = useState(!capture);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [valeurs, setValeurs] = useState({ full_name: "", email: "", phone: "", wilaya: "" });
  const [showTest, setShowTest] = useState(false);
  const t = T[langue];

  useEffect(() => {
    try {
      const gardee = window.localStorage.getItem(CLE_LANGUE);
      if (gardee === "ar" || gardee === "fr") setLangue(gardee);
      // Une visiteuse qui a déjà laissé ses coordonnées retrouve son cours —
      // sur cet appareil (mémoire locale) ou depuis le lien de son e-mail
      // (`?acces=1`), même ouvert sur un autre téléphone.
      const viaEmail = new URLSearchParams(window.location.search).has("acces");
      if (viaEmail) { try { window.localStorage.setItem(`delivery_sent_${slug}`, "1"); } catch { /* ignore */ } }
      if (viaEmail || window.localStorage.getItem(`delivery_sent_${slug}`)) setDebloque(true);
    } catch { /* stockage indisponible : on reste sur les défauts */ }
  }, [slug]);

  // Vue du cadeau → « view_content » vers l'OS (/tracking), une seule fois. Le
  // Pixel ViewContent (Meta) est géré à part par <ViewContentPixel/>.
  useEffect(() => {
    osTrackEvent("view_content", { category: "cours_gratuit", name: data.title ?? slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  function changerLangue() {
    const suite = langue === "fr" ? "ar" : "fr";
    setLangue(suite);
    try { window.localStorage.setItem(CLE_LANGUE, suite); } catch { /* ignore */ }
  }

  const set = (k: keyof typeof valeurs, v: string) => setValeurs((s) => ({ ...s, [k]: v }));

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!valeurs.email.trim() && !valeurs.phone.trim()) { setErreur(t.errContact); return; }
    if (form.require_consent && !accepte) { setErreur(t.errConsent); return; }
    setEnvoi(true);
    try {
      const r = await submitDeliveryLead({
        slug,
        full_name: valeurs.full_name,
        email: valeurs.email,
        phone: valeurs.phone,
        wilaya: valeurs.wilaya,
        consent: accepte,
        lang: langue,
        utm: utmDeLURL(),
      });
      if (!r.ok) {
        setErreur(r.error === "contact_required" ? t.errContact
          : r.error === "consent_required" ? t.errConsent
            : r.error === "closed" ? t.errClosed : t.errGeneric);
        return;
      }
      try { window.localStorage.setItem(`delivery_sent_${slug}`, "1"); } catch { /* ignore */ }
      // Pixel : une inscription à un cours gratuit est un prospect (Lead).
      pixelEvent("Lead", { content_name: data.title ?? slug, content_category: "cours_gratuit" },
        { name: "generate_lead", params: { method: "cours_gratuit", page: slug } });
      setDebloque(true);
      setTimeout(() => document.getElementById("pl-cours")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setErreur(t.errGeneric);
    } finally { setEnvoi(false); }
  }

  const titre = (langue === "ar" && data.title_ar) ? data.title_ar : data.title;
  const description = (langue === "ar" && data.description_ar) ? data.description_ar : data.description;
  const bienvenue = (langue === "ar" && data.welcome_text_ar) ? data.welcome_text_ar : data.welcome_text;
  const merci = (langue === "ar" && form.success_text_ar) ? form.success_text_ar : (form.success_text || t.thanks);
  const { debut, fin } = titreAvecAccent(titre ?? "");
  const video = lecteurVideo(data.video_url);

  // --- Bloc promo affiché SEULEMENT après un vrai visionnage -----------------
  // Seuil = le plus petit entre 10 min et 80 % de la vidéo. On cumule le temps
  // RÉELLEMENT lu (les pauses n'émettent aucun tick ; un seek = saut trop grand,
  // ignoré). Pas de vidéo → comportement d'avant (promo visible). Le déblocage
  // est mémorisé par visiteur (localStorage) pour survivre à un rafraîchissement.
  const promoKey = `arazzo_free_promo_${slug}`;
  const [promoOk, setPromoOk] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!video) { setPromoOk(true); return undefined; } // aucune vidéo → comme avant
    try { if (window.localStorage.getItem(promoKey) === "1") { setPromoOk(true); return undefined; } } catch { /* stockage indispo */ }

    let watched = 0; let last = -1; let duration = 0; let atteint = false;
    const debloquer = () => {
      if (atteint) return;
      const seuil = Math.min(600, (duration || Infinity) * 0.8);
      if (duration && watched >= seuil) {
        atteint = true;
        try { window.localStorage.setItem(promoKey, "1"); } catch { /* ignore */ }
        setPromoOk(true);
      }
    };
    // Un pas de lecture : on ne compte que les petits incréments (lecture réelle),
    // jamais un grand saut (seek) ni une pause (aucun tick n'arrive).
    const pas = (t: number, d: number) => {
      if (d) duration = d;
      if (last >= 0) { const dt = t - last; if (dt > 0 && dt <= 2) watched += dt; }
      last = t; debloquer();
    };

    if (video.kind === "video") {
      const el = videoRef.current;
      if (!el) return undefined;
      const onTime = () => pas(el.currentTime, el.duration || 0);
      const onSeek = () => { last = el.currentTime; }; // ne pas compter le saut
      el.addEventListener("timeupdate", onTime);
      el.addEventListener("seeking", onSeek);
      return () => { el.removeEventListener("timeupdate", onTime); el.removeEventListener("seeking", onSeek); };
    }

    // iframe Bunny : on réutilise la MÊME lib éprouvée que le lecteur de leçon
    // (`player.js`, import dynamique côté client) — le postMessage brut ratait le
    // handshake « ready ». `timeupdate` donne {seconds, duration} ; `seeked` sert à
    // ne pas compter un saut.
    let player: import("player.js").Player | null = null;
    let cancelled = false;
    import("player.js")
      .then(({ default: playerjs }) => {
        if (cancelled || !iframeRef.current) return;
        player = new playerjs.Player(iframeRef.current);
        player.on("ready", () => {
          player!.on("timeupdate", (t) => { if (t) pas(Number(t.seconds) || 0, Number(t.duration) || 0); });
          player!.on("seeked", (t) => { if (t) last = Number(t.seconds) || last; });
        });
      })
      .catch(() => { /* player non dispo → pas de déblocage automatique */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.video_url, debloque]);

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />

      <button type="button" className="pl-langue" onClick={changerLangue} aria-label={t.toggle}>
        🌐 {t.toggle}
      </button>

      <header className="pl-hero">
        <div className="pl-hero-in">
          <div className="pl-marque">
            <a href="/offres" style={{ display: "inline-flex", alignItems: "center", gap: 11, textDecoration: "none", color: "inherit" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="pl-logo" src="/arazzo-icon.png" alt="Arazzo" width={40} height={40} />
              <span className="pl-marque-nom">Arazzo <em>{t.marque}</em></span>
            </a>
          </div>
          <span className="pl-eyebrow">{t.eyebrow}</span>
          <h1 className="pl-titre">{debut}<em>{fin}</em></h1>
          {bienvenue ? <p className="pl-tagline">{bienvenue}</p> : null}
        </div>
      </header>

      <div className="pl-wrap">
        <div className="pl-card">
          {data.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.cover_image_url} alt="" className="pl-programme-img"
              style={{ width: "100%", borderRadius: 14, aspectRatio: "16 / 8", objectFit: "cover", display: "block" }} />
          ) : null}

          {description ? (
            <p className="pl-lede" style={{ ...cssVar("--d", ".05s"), whiteSpace: "pre-line" }}>{description}</p>
          ) : null}

          {/* Formulaire de capture (si activé et pas encore rempli). */}
          {capture && !debloque ? (
            <form id="pl-form" className="pl-form" onSubmit={envoyer} style={cssVar("--d", ".1s")}>
              <h2 className="pl-h2">{t.formTitle}</h2>
              <div className="pl-fields">
                {form.ask_name !== false ? (
                  <label className="pl-field">
                    <span>{t.fName}</span>
                    <input value={valeurs.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder={t.phName} autoComplete="name" />
                  </label>
                ) : null}
                {form.ask_phone !== false ? (
                  <label className="pl-field">
                    <span>{t.fPhone}</span>
                    <input type="tel" value={valeurs.phone} onChange={(e) => set("phone", e.target.value)} placeholder={t.phPhone} autoComplete="tel" />
                  </label>
                ) : null}
                {form.ask_email !== false ? (
                  <label className="pl-field">
                    <span>{t.fEmail}</span>
                    <input type="email" value={valeurs.email} onChange={(e) => set("email", e.target.value)} placeholder={t.phEmail} autoComplete="email" />
                  </label>
                ) : null}
                {form.ask_wilaya ? (
                  <label className="pl-field">
                    <span>{t.fWilaya}</span>
                    <input value={valeurs.wilaya} onChange={(e) => set("wilaya", e.target.value)} placeholder={t.phWilaya} />
                  </label>
                ) : null}
              </div>
              {(form.require_consent || form.consent_text) ? (
                <label className="pl-consent">
                  <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                  <span>{form.consent_text || t.consent}</span>
                </label>
              ) : null}
              {erreur ? <div className="pl-erreur">{erreur}</div> : null}
              <button type="submit" className="pl-cta" disabled={envoi}>{envoi ? t.sending : t.submit}</button>
              <p className="pl-note">{t.note}</p>
            </form>
          ) : null}

          {/* Le cours lui-même (vidéo + PDF), une fois débloqué. */}
          {debloque ? (
            <section id="pl-cours" className="pl-section" style={cssVar("--d", ".1s")}>
              {capture ? <p className="pl-note" style={{ fontWeight: 600 }}>✓ {merci}</p> : null}
              <h2 className="pl-h2">{t.video}</h2>
              {video ? (
                <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 14, overflow: "hidden", background: "#000" }}>
                  {video.kind === "iframe" ? (
                    <iframe ref={iframeRef} title={titre ?? "Cours"} src={video.src} loading="lazy"
                      allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;" allowFullScreen
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                  ) : (
                    <video ref={videoRef} src={video.src} controls playsInline preload="metadata"
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                  )}
                </div>
              ) : null}
              {data.pdf_url ? (
                <div className="pl-map-actions" style={{ marginTop: 14 }}>
                  <a className="pl-map-btn" href={data.pdf_url} target="_blank" rel="noreferrer" download>{t.pdf}</a>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* Le code promo du moment (Live Engine) — affiché SOUS la vidéo, et
              seulement après un vrai visionnage (10 min OU 80 % de la vidéo).
              Promo inactive → PromoBanner rend null (comportement inchangé). */}
          {promoOk ? <PromoBanner promo={data.promo} langue={langue} ctaUrl={data.cta_url} onTest={() => setShowTest(true)} /> : null}

          {/* Le test de niveau (le même que sur la page Offres) : il recommande le
              niveau adapté avec le lien exact pour s'inscrire. */}
          <section className="pl-section pl-testbox" style={cssVar("--d", ".12s")}>
            <h2 className="pl-h2">{t.testTitle}</h2>
            <p className="pl-lede" style={{ margin: "0 0 12px" }}>{t.testText}</p>
            <button type="button" className="pl-testbtn" onClick={() => setShowTest(true)}>{t.testBtn}</button>
          </section>

          {/* Le bouton d'action vers l'offre payante / la ressource associée. */}
          {data.cta_url ? (
            <div style={{ marginTop: 22, ...cssVar("--d", ".15s") }}>
              <a className="pl-cta" href={data.cta_url} style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                {data.cta_label || t.ctaDefault}
              </a>
            </div>
          ) : null}
        </div>

        <p className="pl-pied">{t.pied}</p>
      </div>

      {/* Pixel : la visiteuse a vu le contenu (cours gratuit). PageView est déjà
          émis par le layout ; ViewContent qualifie CETTE page. */}
      <ViewContentPixel category="formation" name={data.title ?? slug} id={`free:${slug}`} />

      {showTest ? (
        <LevelTestPopup
          slug={langue === "ar" ? "niveau-couture-ar" : "niveau-couture"}
          langue={langue}
          utm={{ ...utmDeLURL(), ...(utmDeLURL().utm_source ? {} : { utm_source: "delivery-page" }), utm_content: slug }}
          onClose={() => setShowTest(false)}
        />
      ) : null}
    </div>
  );
}
