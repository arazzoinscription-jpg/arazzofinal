"use client";

/**
 * Landing publique d'une formation EN LIGNE — MÊME DESIGN que l'OS et que la
 * landing présentielle (design partagé `@/lib/landing-kit`). Bilingue FR/AR,
 * bandeau serif, carte, CTA orange.
 *
 * Différence assumée (phase 2, choix validé) : le BACK-END reste NATIF au LMS.
 * Le formulaire appelle les actions existantes du LMS —
 *   • `requestEnrollment` (« on me recontacte » → enrollment_requests)
 *   • `submitDeliveryOrder` (« fiche + livraison » → COD)
 * On ne route PAS l'en ligne vers l'OS (pas de preuve CCP/BaridiMob ici, pas de
 * jauge de places : l'accès en ligne est immédiat, sans cohorte à capacité).
 */

import { useEffect, useState } from "react";
import { LandingStyles } from "@/lib/landing-kit";
import { requestEnrollment } from "@/app/actions/enrollment-request";
import { submitDeliveryOrder } from "@/app/actions/rejoindre";

type CourseView = {
  courseId: string;
  niveau: string;
  name: string;
  name_ar?: string | null;
  tagline?: string | null;
  price_label?: string | null;
  sessions_count?: number | null;
  program_url?: string | null;
};

const CLE_LANGUE = "arazzo_formation_langue";

const T: Record<"ar" | "fr", any> = {
  ar: {
    dir: "rtl",
    eyebrow: "🎓 تكوين عن بُعد",
    modePlatform: "🖥️ عبر المنصّة", modeRythme: "⏳ بإيقاعك الخاص", modeAcces: "♾️ وصول مدى الحياة",
    sessionsLabel: (n: number) => `📚 ${n} حصة`,
    platformLink: "📚 تُقدَّم الدروس على منصّتنا أرازو فورماسيون →",
    presentielTitle: "أفضّل الحضور بسطيف", presentielSub: "تكوين وجهًا لوجه في المركز",
    programBtn: "📋 عرض البرنامج المفصّل", program: "البرنامج",
    noteInscTitle: "💡 كيف يتم حجز مكانك؟",
    noteInscBody: "لحجز مكانك، أكملي التسجيل. سنتواصل معك لتأكيده، أو تختارين استلام وثيقة التسجيل مع الدفع عند التوصيل.",
    formTitle: "أريد التسجيل",
    methodTitle: "كيف تريدين التسجيل؟",
    methodContact: "☎️ يتم التواصل معي", methodContactSub: "نتصل بك لإتمام التسجيل",
    methodDelivery: "📦 وثيقة التسجيل + توصيل", methodDeliverySub: "الدفع عند الاستلام",
    fName: "الاسم الكامل", fPhone: "رقم واتساب", fEmail: "البريد الإلكتروني",
    fWilaya: "الولاية", fWilayaOpt: "الولاية (اختياري)", fAddress: "عنوان التوصيل الكامل",
    phName: "الاسم واللقب", phPhone: "0X XX XX XX XX", phEmail: "you@example.com",
    phWilaya: "مثال: سطيف", phAddress: "الشارع، المدينة…",
    deliveryHint: "📦 تصلك وثيقة التسجيل (مع رمز الدخول) عبر شركة التوصيل، وتدفعين عند الاستلام.",
    consent: "أوافق على أن يتم التواصل معي من طرف Arazzo Formation بخصوص تسجيلي.",
    errConsent: "يرجى الموافقة لكي نتمكن من التواصل معك.",
    errAddress: "يرجى إدخال عنوان التوصيل.",
    note: "معلوماتك تبقى خاصة وتُستعمل لتسجيلك فقط.",
    cta: "أريد التسجيل", send: "جارٍ الإرسال…",
    doneContactTitle: "شكرًا لك! تم التسجيل", doneContactBody: "تم إرسال طلبك. سنتواصل معك قريبًا لإتمام تسجيلك. 🌸",
    doneDeliveryTitle: "تم تسجيل طلبك 📦", doneDeliveryBody: "نحضّر وثيقة تسجيلك (مع رمز الدخول). تصلك عبر شركة التوصيل — وتدفعين عند الاستلام. 🌸",
    pied: "Arazzo · مدرسة الخياطة", toggle: "Français",
  },
  fr: {
    dir: "ltr",
    eyebrow: "🎓 Formation en ligne",
    modePlatform: "🖥️ Sur la plateforme", modeRythme: "⏳ À votre rythme", modeAcces: "♾️ Accès à vie",
    sessionsLabel: (n: number) => `📚 ${n} séance${n > 1 ? "s" : ""}`,
    platformLink: "📚 Les cours se déroulent sur notre plateforme Arazzo Formation →",
    presentielTitle: "Je préfère en présentiel", presentielSub: "En groupe, au centre à Sétif",
    programBtn: "📋 Voir le programme détaillé", program: "Le programme",
    noteInscTitle: "💡 Comment votre place est-elle gardée ?",
    noteInscBody: "Pour garder votre place, terminez l’inscription. Nous vous recontactons pour la finaliser, ou vous choisissez de recevoir une fiche d’inscription avec paiement à la livraison.",
    formTitle: "Je veux m’inscrire",
    methodTitle: "Comment souhaitez-vous vous inscrire ?",
    methodContact: "☎️ On me recontacte", methodContactSub: "On vous appelle pour finaliser",
    methodDelivery: "📦 Fiche d’inscription + livraison", methodDeliverySub: "Paiement à la réception",
    fName: "Prénom et nom", fPhone: "WhatsApp", fEmail: "E-mail",
    fWilaya: "Wilaya", fWilayaOpt: "Wilaya (optionnel)", fAddress: "Adresse de livraison complète",
    phName: "Votre prénom et nom", phPhone: "0X XX XX XX XX", phEmail: "vous@exemple.com",
    phWilaya: "ex. Sétif", phAddress: "Rue, ville…",
    deliveryHint: "📦 Vous recevrez votre fiche d’inscription (avec votre code d’accès) par la société de livraison, à régler à la réception.",
    consent: "J’accepte d’être recontactée par Arazzo Formation au sujet de mon inscription.",
    errConsent: "Merci de cocher la case pour qu’on puisse vous recontacter.",
    errAddress: "Merci d’indiquer votre adresse de livraison.",
    note: "Vos informations restent privées et servent à vous inscrire.",
    cta: "Je veux m’inscrire", send: "Envoi…",
    doneContactTitle: "Merci ! C’est bien noté", doneContactBody: "Votre demande est envoyée. Nous vous recontactons très vite pour finaliser votre inscription. 🌸",
    doneDeliveryTitle: "Commande enregistrée 📦", doneDeliveryBody: "Nous préparons votre fiche d’inscription (avec votre code d’accès). La société de livraison vous l’apportera — vous réglez à la réception. 🌸",
    pied: "Arazzo · École de couture", toggle: "العربية",
  },
};

function titreAvecAccent(nom: string) {
  const mots = String(nom ?? "").trim().split(/\s+/);
  if (mots.length < 2) return { debut: "", fin: nom ?? "" };
  return { debut: mots.slice(0, -1).join(" "), fin: mots[mots.length - 1] };
}

const cssVar = (k: string, v: string) => ({ [k]: v }) as React.CSSProperties;

export default function FormationLanding({ data }: { data: CourseView }) {
  const [langue, setLangue] = useState<"ar" | "fr">("fr");
  const [valeurs, setValeurs] = useState({ full_name: "", phone: "", email: "", wilaya: "", address: "" });
  const [methode, setMethode] = useState<"contact" | "delivery">("contact");
  const [accepte, setAccepte] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<null | "contact" | "delivery">(null);

  useEffect(() => {
    try {
      const g = window.localStorage.getItem(CLE_LANGUE);
      if (g === "fr" || g === "ar") setLangue(g);
    } catch { /* stockage indisponible */ }
  }, []);

  function changerLangue() {
    setLangue((l) => {
      const suite = l === "ar" ? "fr" : "ar";
      try { window.localStorage.setItem(CLE_LANGUE, suite); } catch { /* ignore */ }
      return suite;
    });
  }

  const t = T[langue];
  const set = (k: string, v: string) => setValeurs((s) => ({ ...s, [k]: v }));

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!accepte) { setErreur(t.errConsent); return; }
    if (methode === "delivery" && valeurs.address.trim().length < 4) { setErreur(t.errAddress); return; }
    setEnvoi(true);
    try {
      const r = methode === "delivery"
        ? await submitDeliveryOrder({
          courseId: data.courseId,
          full_name: valeurs.full_name.trim(),
          email: valeurs.email.trim(),
          phone: valeurs.phone.trim(),
          wilaya: valeurs.wilaya.trim() || null,
          address: valeurs.address.trim(),
        })
        : await requestEnrollment({
          courseId: data.courseId,
          full_name: valeurs.full_name.trim(),
          email: valeurs.email.trim(),
          phone: valeurs.phone.trim() || null,
          wilaya: valeurs.wilaya.trim() || null,
        });
      if (r.ok) {
        setFait(methode);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErreur(r.error || "Envoi impossible. Réessayez.");
      }
    } catch {
      setErreur("Envoi impossible. Réessayez.");
    } finally { setEnvoi(false); }
  }

  const nomAffiche = (langue === "ar" && data.name_ar) ? data.name_ar : data.name;
  const { debut, fin } = titreAvecAccent(nomAffiche);
  const presentielUrl = `/presentiel/presentiel-${data.niveau}`;

  return (
    <div className="pl" dir={t.dir}>
      <LandingStyles />

      <button type="button" className="pl-langue" onClick={changerLangue} aria-label={t.toggle}>
        🌐 {t.toggle}
      </button>

      {/* ---------------------------------------------------- Bandeau (hero) --- */}
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
          <h1 className="pl-titre">{debut ? <>{debut} </> : null}<em>{fin}</em></h1>
          {data.tagline ? <p className="pl-tagline">{data.tagline}</p> : null}
          <div className="pl-specs">
            {data.price_label ? <span className="pl-spec pl-spec-prix">💳 {data.price_label}</span> : null}
            {data.sessions_count ? <span className="pl-spec">{t.sessionsLabel(data.sessions_count)}</span> : null}
            <span className="pl-spec">{t.modePlatform}</span>
            <span className="pl-spec">{t.modeRythme}</span>
            <span className="pl-spec">{t.modeAcces}</span>
          </div>
          <a className="pl-platform-link" href="/formations" target="_blank" rel="noreferrer">
            {t.platformLink}
          </a>
        </div>
      </header>

      {/* --------------------------------------------------------- Contenu --- */}
      <div className="pl-wrap">
        <div className="pl-card">
          {fait ? (
            <div className="pl-merci">
              <div className="pl-check" aria-hidden="true">{fait === "delivery" ? "📦" : "✓"}</div>
              <h1 className="pl-titre pl-titre-dark">{fait === "delivery" ? t.doneDeliveryTitle : t.doneContactTitle}</h1>
              <p>{fait === "delivery" ? t.doneDeliveryBody : t.doneContactBody}</p>
            </div>
          ) : (
            <>
              {/* Deux accès côte à côte : présentiel + programme. */}
              <div className="pl-actions" style={{ ...cssVar("--d", ".1s"), gridTemplateColumns: data.program_url ? "1fr 1fr" : "1fr" }}>
                <a className="pl-ghost pl-ghost-alt" href={presentielUrl}>
                  <span className="pl-ghost-ico">🏫</span>
                  <span>
                    <strong>{t.presentielTitle}</strong>
                    <small>{t.presentielSub}</small>
                  </span>
                </a>
                {data.program_url ? (
                  <a className="pl-ghost" href={data.program_url} target="_blank" rel="noreferrer">
                    <span className="pl-ghost-ico">📋</span>
                    <span>
                      <strong>{t.programBtn}</strong>
                      <small>{t.program}</small>
                    </span>
                  </a>
                ) : null}
              </div>

              {/* Note « comment votre place est gardée » — propre à l'en ligne. */}
              <details className="pl-acc" style={cssVar("--d", ".18s")}>
                <summary>{t.noteInscTitle}</summary>
                <div className="pl-acc-body"><p>{t.noteInscBody}</p></div>
              </details>

              {/* Formulaire (back natif LMS). */}
              <form id="pl-form" className="pl-form" onSubmit={envoyer} style={cssVar("--d", ".25s")}>
                <h2 className="pl-h2">{t.formTitle}</h2>

                <fieldset className="pl-methodes">
                  <legend>{t.methodTitle}</legend>
                  <div className="pl-methodes-grid">
                    <button type="button" className="pl-methode" data-on={methode === "contact"}
                      onClick={() => setMethode("contact")}>
                      <strong>{t.methodContact}</strong>
                      <small>{t.methodContactSub}</small>
                    </button>
                    <button type="button" className="pl-methode" data-on={methode === "delivery"}
                      onClick={() => setMethode("delivery")}>
                      <strong>{t.methodDelivery}</strong>
                      <small>{t.methodDeliverySub}</small>
                    </button>
                  </div>
                </fieldset>

                <div className="pl-fields" style={{ marginTop: 14 }}>
                  <label className="pl-field pl-field-full">
                    <span>{t.fName}</span>
                    <input value={valeurs.full_name} required placeholder={t.phName}
                      onChange={(e) => set("full_name", e.target.value)} />
                  </label>
                  <label className="pl-field">
                    <span>{t.fPhone}</span>
                    <input type="tel" value={valeurs.phone} placeholder={t.phPhone}
                      onChange={(e) => set("phone", e.target.value)} />
                  </label>
                  <label className="pl-field">
                    <span>{t.fEmail}</span>
                    <input type="email" value={valeurs.email} required placeholder={t.phEmail}
                      onChange={(e) => set("email", e.target.value)} />
                  </label>
                  <label className={`pl-field${methode === "delivery" ? "" : " pl-field-full"}`}>
                    <span>{methode === "delivery" ? t.fWilaya : t.fWilayaOpt}</span>
                    <input value={valeurs.wilaya} placeholder={t.phWilaya}
                      onChange={(e) => set("wilaya", e.target.value)} />
                  </label>
                  {methode === "delivery" ? (
                    <label className="pl-field pl-field-full">
                      <span>{t.fAddress}</span>
                      <input value={valeurs.address} required placeholder={t.phAddress}
                        onChange={(e) => set("address", e.target.value)} />
                    </label>
                  ) : null}
                </div>

                {methode === "delivery" ? (
                  <p className="pl-note" style={{ marginTop: 8 }}>{t.deliveryHint}</p>
                ) : null}

                <label className="pl-consent">
                  <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} />
                  <span>{t.consent}</span>
                </label>
                {erreur ? <div className="pl-erreur">{erreur}</div> : null}
                <button type="submit" className="pl-cta" disabled={envoi}>
                  {envoi ? t.send : t.cta}
                </button>
                <p className="pl-note">{t.note}</p>
              </form>
            </>
          )}

          <p className="pl-pied">{t.pied}</p>
        </div>
      </div>
    </div>
  );
}
