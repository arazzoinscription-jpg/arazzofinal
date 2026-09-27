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
import { LandingStyles, utmDeLURL } from "@/lib/landing-kit";
import LevelTestPopup from "@/lib/level-test-popup";
import { submitDeliveryOrder } from "@/app/actions/rejoindre";
import { uploadOnlineProof } from "@/lib/upload-online-proof";
import { submitOnlineEnrollment } from "@/app/actions/online-enrollment";
import { trackLead, trackPurchase } from "@/lib/track-conversion";

type CourseView = {
  courseId: string;
  niveau: string;
  name: string;
  name_ar?: string | null;
  tagline?: string | null;
  price_label?: string | null;
  sessions_count?: number | null;
  program_url?: string | null;
  // Pack composé (OS) : formations réunies + prix barré → prix pack.
  is_pack?: boolean;
  pack_courses?: { id: string; title: string; prix: number | null; slug: string | null }[];
  pack_cumul?: number;
  pack_prix?: number;
  pack_eco?: number;
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
    packTitle: "محتوى الحزمة (Pack)", packIncludes: "تكوينان في حزمة واحدة",
    packSee: "عرض التكوين", packValue: "القيمة الإجمالية", packEco: (n: string) => `🎁 توفير ${n}`,
    testPhrase: "لا تعرفين من أين تبدئين؟ لديكِ معرفة بسيطة وتريدين تطويرها؟ قومي باختبار المستوى.",
    testBtn: "📝 اختبار المستوى",
    noteInscTitle: "💡 كيف يتم حجز مكانك؟",
    noteInscBody: "لحجز مكانك، يجب إتمام التسجيل بالدفع. بمجرد إرسال الدفع، يصبح تسجيلك فوريًا ويُحجز مكانك مباشرة.",
    formTitle: "أريد التسجيل",
    methodTitle: "كيف تريدين الدفع؟",
    methodDelivery: "📝 أفضّل وثيقة تسجيل", methodDeliverySub: "تصلكِ بالتوصيل · الدفع عند الاستلام",
    methodPaid: "💳 أدفع عبر CCP / BaridiMob", methodPaidSub: "سترسلين إثبات الدفع",
    paidHint: "قومي بالدفع عبر CCP أو BaridiMob، ثم أرفقي صورة الوصل. سنؤكّد الدفع ونفعّل دخولك.",
    fProof: "وصل الدفع (صورة أو PDF)", proofChoose: "اضغطي لإرفاق الوصل (JPG · PNG · PDF)",
    fAmount: "المبلغ المدفوع (دج)", phAmount: "مثال: 4500", fRef: "رقم العملية", phRef: "اختياري", refOptional: "(اختياري)",
    errProof: "يرجى إرفاق وصل الدفع.",
    doneProofTitle: "تم استلام إثبات الدفع 🌸", doneProofBody: "شكرًا لك! نتحقق من الدفع ثم نفعّل دخولك — ستصلك رسالة بمعلومات الاتصال. 🌸",
    fName: "الاسم الكامل", fPhone: "رقم واتساب", fEmail: "البريد الإلكتروني",
    fWilaya: "الولاية", fWilayaOpt: "الولاية (اختياري)", fAddress: "عنوان التوصيل الكامل",
    phName: "الاسم واللقب", phPhone: "0X XX XX XX XX", phEmail: "you@example.com",
    phWilaya: "مثال: سطيف", phAddress: "الشارع، المدينة…",
    deliveryHint: "📦 تصلك وثيقة التسجيل (مع رمز الدخول) عبر شركة التوصيل، وتدفعين عند الاستلام.",
    ficheTitle: "📝 وثيقة التسجيل، كيف تعمل؟",
    ficheIntro: "تفضّلين عدم الدفع عبر الإنترنت؟ نرسل لكِ وثيقة تسجيل ورقية عبر شركة التوصيل. تملئينها، تدفعين عند الاستلام، ثم يُفتح لكِ الوصول.",
    ficheSteps: [
      "تملئين عنوانكِ أدناه.",
      "تُحضر لكِ شركة التوصيل وثيقة التسجيل إلى عنوانكِ.",
      "تدفعين عند الاستلام (الدفع عند التوصيل).",
      "يُفتح لكِ الوصول إلى التكوين بعد الدفع.",
    ],
    ficheDelay: "⏱️ مدة الاستلام: من 3 إلى 5 أيام عمل حسب ولايتكِ.",
    ficheImgLegende: "هكذا تبدو الوثيقة التي ستصلكِ:",
    ficheImgAlt: "نموذج وثيقة التسجيل",
    promoLabel: "كود الهدية / التخفيض", promoPh: "مثال: SARAH500", promoOptional: "(اختياري)",
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
    packTitle: "Ce que contient le pack", packIncludes: "Deux formations réunies en un pack",
    packSee: "Voir la formation", packValue: "Valeur totale", packEco: (n: string) => `🎁 Vous économisez ${n}`,
    testPhrase: "Vous ne savez pas par où commencer ? Vous avez quelques bases à développer ? Faites le test de niveau.",
    testBtn: "📝 Faire le test de niveau",
    noteInscTitle: "💡 Comment votre place est-elle gardée ?",
    noteInscBody: "Pour garder votre place, il faut terminer l’inscription par le paiement. Dès que le paiement est envoyé, votre inscription est instantanée : votre place est réservée immédiatement.",
    formTitle: "Je veux m’inscrire",
    methodTitle: "Comment souhaitez-vous régler ?",
    methodDelivery: "📝 Je préfère une fiche d’inscription", methodDeliverySub: "Reçue par livraison · paiement à la réception",
    methodPaid: "💳 Je paie avec CCP / BaridiMob", methodPaidSub: "Vous enverrez la preuve de paiement",
    paidHint: "Effectuez votre versement CCP ou BaridiMob, puis joignez le reçu. Nous confirmons le paiement et activons votre accès.",
    fProof: "Reçu de paiement (photo ou PDF)", proofChoose: "Cliquez pour joindre le reçu (JPG · PNG · PDF)",
    fAmount: "Montant versé (DA)", phAmount: "ex. 4500", fRef: "N° de transaction", phRef: "optionnel", refOptional: "(optionnel)",
    errProof: "Merci de joindre votre reçu de paiement.",
    doneProofTitle: "Preuve de paiement reçue 🌸", doneProofBody: "Merci ! Nous vérifions le paiement puis activons votre accès — vous recevrez vos identifiants par e-mail. 🌸",
    fName: "Prénom et nom", fPhone: "WhatsApp", fEmail: "E-mail",
    fWilaya: "Wilaya", fWilayaOpt: "Wilaya (optionnel)", fAddress: "Adresse de livraison complète",
    phName: "Votre prénom et nom", phPhone: "0X XX XX XX XX", phEmail: "vous@exemple.com",
    phWilaya: "ex. Sétif", phAddress: "Rue, ville…",
    deliveryHint: "📦 Vous recevrez votre fiche d’inscription (avec votre code d’accès) par la société de livraison, à régler à la réception.",
    ficheTitle: "📝 La fiche d’inscription, comment ça marche ?",
    ficheIntro: "Vous préférez ne pas payer en ligne ? Nous vous envoyons une fiche d’inscription papier par la société de livraison. Vous la remplissez, vous réglez à la réception, et votre accès s’ouvre ensuite.",
    ficheSteps: [
      "Vous remplissez votre adresse ci-dessous.",
      "La société de livraison vous apporte la fiche d’inscription à votre adresse.",
      "Vous réglez à la réception (paiement à la livraison).",
      "Votre accès à la formation s’ouvre après le paiement.",
    ],
    ficheDelay: "⏱️ Délai de réception : 3 à 5 jours ouvrables selon votre wilaya.",
    ficheImgLegende: "Voici à quoi ressemble la fiche que vous recevrez :",
    ficheImgAlt: "Modèle de la fiche d’inscription",
    promoLabel: "Code cadeau / promo", promoPh: "Ex. SARAH500", promoOptional: "(optionnel)",
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
  const [valeurs, setValeurs] = useState({ full_name: "", phone: "", email: "", wilaya: "", address: "", amount: "", reference: "" });
  const [methode, setMethode] = useState<"delivery" | "paid">("paid");
  const [preuve, setPreuve] = useState<File | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<null | "delivery" | "paid">(null);
  const [showTest, setShowTest] = useState(false);
  const testSlug = langue === "ar" ? "niveau-couture-ar" : "niveau-couture";

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
    if (methode === "paid" && !preuve) { setErreur(t.errProof); return; }
    setEnvoi(true);
    try {
      // « J'ai payé » : on téléverse le reçu, puis on dépose la demande + la preuve.
      // Arazzo OS la rapatrie et la valide (accès activé, e-mail de bienvenue).
      if (methode === "paid") {
        const up = await uploadOnlineProof(preuve as File);
        if (!up.ok || !up.path) { setErreur(up.error || "Envoi du reçu échoué."); setEnvoi(false); return; }
        const r = await submitOnlineEnrollment({
          level: data.niveau,
          course_id: data.courseId,
          full_name: valeurs.full_name.trim(),
          email: valeurs.email.trim() || "",
          phone: valeurs.phone.trim() || "",
          wilaya: valeurs.wilaya.trim() || "",
          amount: valeurs.amount.trim() || null,
          method: "ccp",
          reference: valeurs.reference.trim() || "",
          coupon_code: coupon.trim() || "",
          proof_path: up.path,
          consent: accepte,
          lang: langue,
          utm: utmDeLURL(),
        });
        if (r.ok) {
          // Conversion : preuve de paiement envoyée → Purchase (Meta + Google).
          trackPurchase({ content_name: data.name, value: Number(valeurs.amount) || data.pack_prix || undefined });
          setFait("paid"); window.scrollTo({ top: 0, behavior: "smooth" });
        }
        else setErreur(r.error === "validation_failed" ? "Merci de vérifier vos informations." : (r.error || "Envoi impossible. Réessayez."));
        setEnvoi(false);
        return;
      }
      // Fiche + livraison : demande COD native (paiement à la réception).
      const r = await submitDeliveryOrder({
        courseId: data.courseId,
        full_name: valeurs.full_name.trim(),
        email: valeurs.email.trim(),
        phone: valeurs.phone.trim(),
        wilaya: valeurs.wilaya.trim() || null,
        address: valeurs.address.trim(),
        coupon_code: coupon.trim() || undefined,
      });
      if (r.ok) {
        // Conversion : demande « fiche + livraison » envoyée → Lead.
        trackLead({ content_name: data.name });
        setFait("delivery");
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
              <div className="pl-check" aria-hidden="true">{fait === "delivery" ? "📦" : fait === "paid" ? "💳" : "✓"}</div>
              <h1 className="pl-titre pl-titre-dark">{fait === "delivery" ? t.doneDeliveryTitle : fait === "paid" ? t.doneProofTitle : t.doneContactTitle}</h1>
              <p>{fait === "delivery" ? t.doneDeliveryBody : fait === "paid" ? t.doneProofBody : t.doneContactBody}</p>
            </div>
          ) : (
            <>
              {/* Bloc PACK : les formations réunies côte à côte + prix barré → prix pack. */}
              {data.is_pack ? (
                <section className="pl-section pl-packbox" style={cssVar("--d", ".03s")}>
                  <h2 className="pl-h2">🎁 {t.packTitle}</h2>
                  <p className="pl-lede" style={{ margin: "0 0 14px" }}>{t.packIncludes}</p>
                  <div className="pl-pack-duo">
                    {(data.pack_courses ?? []).map((c: any, i: number) => (
                      <div className="pl-pack-carte" key={c.id || i}>
                        <span className="pl-pack-carte-num">{i + 1}</span>
                        <span className="pl-pack-carte-t">{c.title}</span>
                        {c.prix != null ? <span className="pl-pack-carte-prix">{Number(c.prix).toLocaleString("fr-FR")} DA</span> : null}
                        {c.slug ? <a className="pl-pack-carte-lien" href={`/boutique/${c.slug}`}>{t.packSee} →</a> : null}
                      </div>
                    ))}
                  </div>
                  <div className="pl-pack-offre">
                    {(data.pack_eco ?? 0) > 0 ? (
                      <div className="pl-pack-prix">
                        <span className="pl-pack-val">{t.packValue}</span>
                        <span className="pl-pack-cumul">{Number(data.pack_cumul ?? 0).toLocaleString("fr-FR")} DA</span>
                        <span className="pl-pack-fleche" aria-hidden="true">→</span>
                        <span className="pl-pack-net">{Number(data.pack_prix ?? 0).toLocaleString("fr-FR")} DA</span>
                      </div>
                    ) : (
                      <div className="pl-pack-prix"><span className="pl-pack-net">{Number(data.pack_prix ?? 0).toLocaleString("fr-FR")} DA</span></div>
                    )}
                    {(data.pack_eco ?? 0) > 0 ? <div className="pl-pack-eco">{t.packEco(`${Number(data.pack_eco ?? 0).toLocaleString("fr-FR")} DA`)}</div> : null}
                  </div>
                </section>
              ) : null}

              {/* Deux accès côte à côte : présentiel + programme (pas pour un pack). */}
              {!data.is_pack ? (
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
              ) : null}

              {/* Invitation au test de niveau — pas pour un pack (plusieurs formations). */}
              {!data.is_pack ? (
              <div className="pl-testbox" style={cssVar("--d", ".16s")}>
                <p>{t.testPhrase}</p>
                <button type="button" className="pl-testbtn" onClick={() => setShowTest(true)}>{t.testBtn}</button>
              </div>
              ) : null}

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
                    <button type="button" className="pl-methode" data-on={methode === "paid"}
                      onClick={() => setMethode("paid")}>
                      <strong>{t.methodPaid}</strong>
                      <small>{t.methodPaidSub}</small>
                    </button>
                    {!data.is_pack ? (
                      <button type="button" className="pl-methode" data-on={methode === "delivery"}
                        onClick={() => setMethode("delivery")}>
                        <strong>{t.methodDelivery}</strong>
                        <small>{t.methodDeliverySub}</small>
                      </button>
                    ) : null}
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
                  {methode === "paid" ? (
                    <>
                      <label className="pl-field">
                        <span>{t.fAmount}</span>
                        <input type="number" inputMode="numeric" min={0} value={valeurs.amount} placeholder={t.phAmount}
                          onChange={(e) => set("amount", e.target.value)} />
                      </label>
                      <label className="pl-field">
                        <span>{t.fRef} <em>{t.refOptional}</em></span>
                        <input value={valeurs.reference} placeholder={t.phRef}
                          onChange={(e) => set("reference", e.target.value)} />
                      </label>
                    </>
                  ) : null}
                </div>

                {methode === "delivery" ? (
                  <div className="pl-fiche" style={{ marginTop: 12 }}>
                    <h3 className="pl-h2" style={{ fontSize: "1.05rem", margin: "0 0 6px" }}>{t.ficheTitle}</h3>
                    <p className="pl-lede" style={{ margin: "0 0 10px" }}>{t.ficheIntro}</p>
                    <ol className="pl-fiche-steps">
                      {t.ficheSteps.map((s: string, i: number) => <li key={i}>{s}</li>)}
                    </ol>
                    <p className="pl-note" style={{ margin: "8px 0 12px", fontWeight: 600 }}>{t.ficheDelay}</p>
                    <p className="pl-note" style={{ margin: "0 0 6px" }}>{t.ficheImgLegende}</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className="pl-fiche-img" src="/fiche-inscription-modele.jpg" alt={t.ficheImgAlt}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                ) : null}

                {methode === "paid" ? (
                  <>
                    <p className="pl-note" style={{ marginTop: 8 }}>{t.paidHint}</p>
                    <label className="pl-field pl-field-full" style={{ marginTop: 10 }}>
                      <span>{t.fProof}</span>
                      <input type="file" accept="image/jpeg,image/png,application/pdf"
                        onChange={(e) => setPreuve(e.target.files?.[0] ?? null)} />
                      <small style={{ color: "#6b6480" }}>{preuve ? preuve.name : t.proofChoose}</small>
                    </label>
                  </>
                ) : null}

                {/* Code cadeau / promo (Live) — capturé avec la demande. */}
                <label className="pl-field pl-field-full" style={{ marginTop: 14 }}>
                  <span>🎁 {t.promoLabel} <em>{t.promoOptional}</em></span>
                  <input value={coupon} placeholder={t.promoPh}
                    style={{ textTransform: "uppercase" }}
                    onChange={(e) => setCoupon(e.target.value.toUpperCase())} />
                </label>

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

      {showTest ? (
        <LevelTestPopup slug={testSlug} langue={langue} utm={utmDeLURL()}
          onClose={() => setShowTest(false)}
          onSubscribe={() => { const el = document.getElementById("pl-form"); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }} />
      ) : null}
    </div>
  );
}
